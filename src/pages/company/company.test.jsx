import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../i18n";

import queueReducer from "../../features/queue/queueSlice";
import appointmentsReducer from "../../features/appointments/appointmentsSlice";
import barbersReducer from "../../features/barbers/barbersSlice";
import servicesReducer from "../../features/services/servicesSlice";
import customersReducer from "../../features/customers/customersSlice";
import chatReducer from "../../features/chat/chatSlice";

/*
 * The two screens a shop uses all day.
 *
 * These exist because of what the audit found, so they assert the fixes rather
 * than the markup: no action is conveyed by an icon without an accessible
 * name, destructive actions are confirmed with their real consequence, the
 * queue position comes from the server rather than an array index, and a
 * booking's status is read through the shared helper.
 */

/* Each screen fetches on mount, so fixtures have to come back from the API —
   anything in preloadedState is overwritten by the first response. */
const served = { queue: [], appointments: [], barbers: [], services: [], failQueue: null };

vi.mock("../../services/api", () => ({
  default: {
    get: vi.fn((url) => {
      if (url.startsWith("/queue")) {
        return served.failQueue
          ? Promise.reject({ response: { data: { message: served.failQueue } } })
          : Promise.resolve({ data: { data: served.queue } });
      }
      if (url.startsWith("/appointments")) return Promise.resolve({ data: { data: served.appointments } });
      if (url.startsWith("/barbers")) return Promise.resolve({ data: { data: served.barbers } });
      if (url.startsWith("/services")) return Promise.resolve({ data: { data: served.services } });
      return Promise.resolve({ data: { data: [] } });
    }),
    post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    patch: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    delete: vi.fn(() => Promise.resolve({ data: {} }))
  }
}));

vi.mock("../../services/socket", () => ({
  getSocket: () => null,
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn()
}));

import Queue from "./Queue";
import Appointments from "./Appointments";

const OWNER = { id: "u-1", fullName: "Owner", roles: ["ADMIN"], tenantId: "t-1" };

const queueItem = (overrides = {}) => ({
  id: "q-1",
  customerId: "c-1",
  customerName: "Karim",
  customerPhone: "03111222",
  barberId: "b-1",
  barberName: "Sami",
  statusId: 1,
  position: 2,
  joinedAt: "2026-09-11T09:30:00",
  totalDuration: 30,
  notificationSent: false,
  services: [{ id: "s-1", name: "Fade" }],
  ...overrides
});

const appointment = (overrides = {}) => ({
  Id: "a-1",
  StartTime: "2026-09-11T10:30:00",
  Status: "SCHEDULED",
  StatusId: 1,
  PaymentStatus: "UNPAID",
  CustomerId: "c-1",
  CustomerName: "Karim",
  CustomerPhone: "03111222",
  BarberId: "b-1",
  BarberName: "Sami",
  Currency: "USD",
  services: [{ id: "s-1", name: "Fade", price: 20, durationMinutes: 30 }],
  ...overrides
});

function renderScreen(ui, preloaded = {}) {
  const store = configureStore({
    reducer: {
      queue: queueReducer,
      appointments: appointmentsReducer,
      barbers: barbersReducer,
      services: servicesReducer,
      customers: customersReducer,
      chat: chatReducer,
      auth: (state = { user: OWNER }) => state
    },
    preloadedState: preloaded
  });

  return render(
    <Provider store={store}>
      <I18nProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </I18nProvider>
    </Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  served.queue = [];
  served.appointments = [];
  served.barbers = [];
  served.services = [];
  served.failQueue = null;
});

describe("Queue tab", () => {
  it("shows the server's own position, not the array index", async () => {
    served.queue = [queueItem({ position: 3 })];
    renderScreen(<Queue />);

    // The old screen rendered `#${index}`, so the first person read "#0".
    expect(await screen.findByText("#3")).toBeInTheDocument();
    expect(screen.queryByText("#0")).not.toBeInTheDocument();
  });

  it("gives every icon-only control a real accessible name", async () => {
    served.queue = [queueItem()];
    renderScreen(<Queue />);

    // Previously the notify control's entire content was a bell emoji with
    // only a `title`, so it announced as "bell emoji button".
    expect(await screen.findByRole("button", { name: "Call customer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark No Show" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add walk-in" })).toBeInTheDocument();
  });

  it("offers no-show on someone who is not at the front of the line", async () => {
    served.queue = [
      queueItem({ id: "q-1", position: 1 }),
      queueItem({ id: "q-2", position: 3, customerName: "Omar" })
    ];
    renderScreen(<Queue />);

    // It used to be gated on index === 0, so the third person could not be
    // removed at all.
    const rows = await screen.findAllByRole("button", { name: "Mark No Show" });
    expect(rows.length).toBe(2);
  });

  it("spells out that calling next also finishes the current customer", async () => {
    served.queue = [
      queueItem({ id: "q-0", statusId: 2, customerName: "Ali" }),
      queueItem({ id: "q-1", position: 1, customerName: "Omar" })
    ];
    renderScreen(<Queue />);

    await userEvent.click(await screen.findByRole("button", { name: /Call next/i }));

    // moveNext completes the in-chair customer and seats the next in one
    // transaction — the confirmation has to say so.
    expect(await screen.findByText(/finishes Ali's service and starts Omar/i)).toBeInTheDocument();
  });

  it("marks a customer who has already been called", async () => {
    served.queue = [queueItem({ notificationSent: true })];
    renderScreen(<Queue />);

    // NotificationSent existed in the schema since migration 013 and nothing
    // read it, so a shop had no way to tell who it had already called.
    expect(await screen.findByText("Called")).toBeInTheDocument();
  });

  it("shows an error with a retry instead of stacking it on an empty state", async () => {
    served.failQueue = "Server exploded";
    renderScreen(<Queue />);

    // Error and empty used to render stacked on top of each other.
    expect(await screen.findByText("Server exploded")).toBeInTheDocument();
    expect(screen.queryByText("Nobody waiting")).not.toBeInTheDocument();
  });
});

describe("Calendar tab", () => {
  it("labels every action in words", async () => {
    served.appointments = [appointment()];
    renderScreen(<Appointments />);

    // Seven controls here were emoji-only, and ✅ meant both "accept" and
    // "complete" depending on the row.
    expect(await screen.findByRole("button", { name: "Check in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Complete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark No Show" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel Appointment" })).toBeInTheDocument();
  });

  it("says what checking someone in actually does", async () => {
    served.appointments = [appointment()];
    renderScreen(<Appointments />);

    await userEvent.click(await screen.findByRole("button", { name: "Check in" }));

    // The old copy claimed check-in "will update the appointment as
    // completed", which is not what the endpoint does.
    expect(await screen.findByText(/moves them into the walk-in queue/i)).toBeInTheDocument();
    expect(screen.queryByText(/as completed/i)).not.toBeInTheDocument();
  });

  it("distinguishes a paid deposit from a fully paid booking", async () => {
    served.appointments = [appointment({ PaymentStatus: "DEPOSIT_PAID" })];
    renderScreen(<Appointments />);

    // The payment badge was a binary PENDING ? Verifying : Paid, so a
    // deposit-only booking advertised itself as settled in full.
    expect(await screen.findByText("Deposit paid")).toBeInTheDocument();
    expect(screen.queryByText("Paid")).not.toBeInTheDocument();
  });

  it("reads status through the shared helper rather than its own map", async () => {
    // Only StatusId, no Status name — the inline map used to fall through to
    // the SCHEDULED badge for anything it did not recognise.
    served.appointments = [appointment({ Status: undefined, StatusId: 4 })];
    renderScreen(<Appointments />);

    expect(await screen.findByText("No Show")).toBeInTheDocument();
  });

  it("shows the barber on a narrow screen", async () => {
    served.appointments = [appointment()];
    renderScreen(<Appointments />);

    // The barber column was `hidden lg:block`, so an owner on a phone could
    // not tell whose booking it was.
    const row = (await screen.findByText("Karim")).closest("div");
    expect(within(row.parentElement).getByText(/Sami/)).toBeInTheDocument();
  });
});
