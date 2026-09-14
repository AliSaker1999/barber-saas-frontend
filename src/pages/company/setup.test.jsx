import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../i18n";

import setupReducer from "../../features/setup/setupSlice";
import servicesReducer from "../../features/services/servicesSlice";
import barbersReducer from "../../features/barbers/barbersSlice";
import companyReducer from "../../features/company/companySlice";
import workingHoursReducer from "../../features/workingHours/workingHoursSlice";
import scheduleRequestsReducer from "../../features/scheduleRequests/scheduleRequestsSlice";

import {
  weekFromShopHours,
  weekFromBarberHours,
  barberDaysFromWeek,
  invalidDays
} from "../../components/setup/weekHours";
import { firstIncompleteStep } from "../../components/setup/setupSteps";

/*
 * Shop setup.
 *
 * These assert the behaviours the block exists for, not the markup: the wizard
 * reads progress from the server rather than tracking it, a blocking step says
 * why it is blocked, an optional step says what skipping costs, and the
 * service assignment is a single idempotent PUT rather than a toggle per tap.
 */

/* Every screen fetches on mount, so fixtures have to come back from the API —
   anything in preloadedState is overwritten by the first response. */
const served = {
  setup: null,
  services: [],
  barbers: [],
  hours: [],
  availability: [],
  requests: [],
  profile: { Name: "Test Shop", City: "Beirut" }
};

const calls = { put: [], post: [], patch: [] };

vi.mock("../../services/api", () => ({
  default: {
    get: vi.fn((url) => {
      if (url.includes("setup-status")) return Promise.resolve({ data: { data: served.setup } });
      if (url.includes("/tenants/profile")) return Promise.resolve({ data: { data: served.profile } });
      if (url.includes("/hours")) return Promise.resolve({ data: { data: served.hours } });
      if (url.includes("/availability")) return Promise.resolve({ data: { data: served.availability } });
      if (url.startsWith("/services")) return Promise.resolve({ data: { data: served.services } });
      if (url.startsWith("/barbers")) return Promise.resolve({ data: { data: served.barbers } });
      if (url.includes("schedule-request")) return Promise.resolve({ data: { data: served.requests } });
      return Promise.resolve({ data: { data: [] } });
    }),
    post: vi.fn((url, body) => {
      calls.post.push({ url, body });
      return Promise.resolve({ data: { data: {} } });
    }),
    put: vi.fn((url, body) => {
      calls.put.push({ url, body });
      return Promise.resolve({ data: { data: { serviceIds: body?.serviceIds ?? [] } } });
    }),
    patch: vi.fn((url, body) => {
      calls.patch.push({ url, body });
      return Promise.resolve({ data: { data: {} } });
    }),
    delete: vi.fn(() => Promise.resolve({ data: {} }))
  }
}));

import SetupWizard from "./SetupWizard";
import ServicesEditor from "../../components/setup/ServicesEditor";
import BarberServicesEditor from "../../components/setup/BarberServicesEditor";
import TeamEditor from "../../components/setup/TeamEditor";
import SetupBanner from "../../components/setup/SetupBanner";
import BarberHoursEditor from "../../components/setup/BarberHoursEditor";

const OWNER = {
  id: "u-1",
  fullName: "Owner",
  email: "owner@shop.com",
  roles: ["ADMIN"],
  tenantId: "t-1",
  currency: "USD"
};

const check = (key, ok, extra = {}) => ({ key, ok, blocking: true, ...extra });

const status = (overrides = {}) => {
  const checks = overrides.checks || [
    check("identity", true),
    check("services", false, { count: 0 }),
    check("team", false, { count: 0 }),
    check("bookable", false, { count: 0, detail: { missingServices: 0, missingHours: 0 } }),
    { key: "shop_hours", ok: false, blocking: false, count: 0 },
    { key: "branding", ok: false, blocking: false }
  ];
  const blockers = checks.filter((c) => c.blocking && !c.ok).map((c) => c.key);
  return { ready: blockers.length === 0, isLive: true, blockers, checks, slug: "test-shop", ...overrides };
};

function renderWith(ui, route = "/") {
  const store = configureStore({
    reducer: {
      setup: setupReducer,
      services: servicesReducer,
      barbers: barbersReducer,
      company: companyReducer,
      workingHours: workingHoursReducer,
      scheduleRequests: scheduleRequestsReducer,
      auth: (state = { user: OWNER }) => state
    }
  });

  return render(
    <Provider store={store}>
      <I18nProvider>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </I18nProvider>
    </Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  calls.put = [];
  calls.post = [];
  calls.patch = [];
  served.setup = status();
  served.services = [];
  served.barbers = [];
  served.hours = [];
  served.availability = [];
  served.requests = [];
  served.profile = { Name: "Test Shop", City: "Beirut" };
});

describe("the wizard", () => {
  it("opens on the first blocking step that is not done, not at the beginning", async () => {
    /* Identity is already done, so a wizard that tracked its own progress would
       still start at the welcome screen. This one reads the server. */
    renderWith(<SetupWizard />);

    expect(await screen.findByText("What you offer")).toBeInTheDocument();
    expect(screen.queryByText("Let us get you open")).not.toBeInTheDocument();
  });

  it("says in words why a blocking step will not let you continue", async () => {
    renderWith(<SetupWizard />);

    /* The disabled state alone is not an explanation. */
    expect(await screen.findByText("Add at least one service to continue.")).toBeInTheDocument();

    const next = screen.getByRole("button", { name: /Continue/i });
    expect(next).toBeDisabled();
  });

  it("lets an optional step be skipped, and names what skipping costs", async () => {
    served.setup = status({
      checks: [
        check("identity", true),
        check("services", true, { count: 2 }),
        check("team", true, { count: 1 }),
        check("bookable", true, { count: 1, detail: { missingServices: 0, missingHours: 0 } }),
        { key: "shop_hours", ok: false, blocking: false, count: 0 },
        { key: "branding", ok: false, blocking: false }
      ]
    });

    renderWith(<SetupWizard />, "/?step=shop_hours");

    expect(await screen.findByRole("button", { name: "Use my barbers' hours" })).toBeInTheDocument();
    /* The cost is stated, rather than the step just being dismissible. */
    expect(
      screen.getByText(/your opening times follow your barbers' rotas/i)
    ).toBeInTheDocument();
  });

  it("reports a paused shop as something the owner cannot fix themselves", async () => {
    served.setup = status({ isLive: false });
    renderWith(<SetupWizard />, "/?step=welcome");

    expect(await screen.findByText(/Contact Ajmal to reactivate/i)).toBeInTheDocument();
  });
});

describe("ServicesEditor", () => {
  const service = { Id: "s-1", Name: "Fade", Price: 20, DurationMinutes: 30, IsActive: true };

  it("offers no destructive action during setup, and does when managing", async () => {
    served.services = [service];

    const { unmount } = renderWith(<ServicesEditor mode="setup" />);
    expect(await screen.findByText("Fade")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
    unmount();

    renderWith(<ServicesEditor mode="manage" />);
    expect(await screen.findByRole("button", { name: "Delete — Fade" })).toBeInTheDocument();
  });

  it("names how many barbers stop offering a service before deleting it", async () => {
    served.services = [service];
    served.barbers = [
      { Id: "b-1", FullName: "Sami", ServiceIds: ["s-1"] },
      { Id: "b-2", FullName: "Ali", ServiceIds: ["s-1"] }
    ];

    renderWith(<ServicesEditor mode="manage" />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete — Fade" }));

    /* Deleting cascades through BarberServices, so the consequence is a
       number, not "are you sure?". */
    expect(
      await screen.findByText("This also stops 2 of your barbers offering it.")
    ).toBeInTheDocument();
  });

  it("keeps what was typed when the add fails", async () => {
    const api = (await import("../../services/api")).default;
    api.post.mockImplementationOnce(() =>
      Promise.reject({ response: { data: { message: "Service already exists" } } })
    );

    renderWith(<ServicesEditor mode="manage" />);

    await userEvent.type(await screen.findByLabelText("Service name"), "Fade");
    await userEvent.type(screen.getByLabelText("Price"), "20");
    await userEvent.type(screen.getByLabelText("Duration"), "30");
    await userEvent.click(screen.getByRole("button", { name: /Add service/i }));

    /* The form used to be cleared outside the promise, so a failed add threw
       away everything the owner had typed. */
    expect(await screen.findByText("Service already exists")).toBeInTheDocument();
    expect(screen.getByLabelText("Service name")).toHaveValue("Fade");
  });
});

describe("BarberServicesEditor", () => {
  beforeEach(() => {
    served.services = [
      { Id: "s-1", Name: "Fade", Price: 20, DurationMinutes: 30 },
      { Id: "s-2", Name: "Beard", Price: 10, DurationMinutes: 15 }
    ];
    served.barbers = [{ Id: "b-1", FullName: "Sami", ServiceIds: ["s-1"] }];
  });

  it("saves the whole list in one PUT, never a toggle per tap", async () => {
    renderWith(<BarberServicesEditor barberId="b-1" />);

    await userEvent.click(await screen.findByRole("button", { name: /Beard/ }));
    await userEvent.click(screen.getByRole("button", { name: /Save services/i }));

    await screen.findByRole("button", { name: /Saved/i });

    /* POST /barbers/:id/services *toggles*, so a retry would un-assign. One
       PUT stating the end state is the whole point of this editor. */
    expect(calls.put).toHaveLength(1);
    expect(calls.put[0].url).toBe("/barbers/b-1/services");
    expect(calls.put[0].body.serviceIds.slice().sort()).toEqual(["s-1", "s-2"]);
    expect(calls.post.filter((c) => c.url.includes("/services"))).toHaveLength(0);
  });

  it("warns that a barber with no services cannot be booked", async () => {
    renderWith(<BarberServicesEditor barberId="b-1" />);

    await userEvent.click(await screen.findByRole("button", { name: /Fade/ }));

    expect(
      screen.getByText("With no services selected, customers cannot book this barber.")
    ).toBeInTheDocument();
  });
});

describe("TeamEditor", () => {
  it("confirms adding yourself before sending anything, and marks it self-assign", async () => {
    renderWith(<TeamEditor mode="setup" />);

    await userEvent.click(await screen.findByRole("button", { name: "Add myself as a barber" }));

    /* The old screen only discovered self-assign by posting, failing, and
       string-matching the 409 that came back. */
    expect(await screen.findByText("Add yourself to the team?")).toBeInTheDocument();
    expect(calls.post).toHaveLength(0);

    await userEvent.click(
      screen.getAllByRole("button", { name: "Add myself as a barber" }).pop()
    );

    const created = calls.post.find((c) => c.url === "/barbers");
    expect(created).toBeTruthy();
    expect(created.body.selfAssign).toBe(true);
    expect(created.body.email).toBe("owner@shop.com");
  });

  it("flags a barber who performs no services on the row itself", async () => {
    served.barbers = [{ Id: "b-1", FullName: "Sami", ServiceIds: [] }];
    renderWith(<TeamEditor mode="manage" />);

    expect(await screen.findByText("No services yet, so nobody can book them")).toBeInTheDocument();
  });
});

describe("SetupBanner", () => {
  it("shows what is left, and disappears once the shop is ready", async () => {
    renderWith(<SetupBanner />);
    expect(await screen.findByText("3 steps left before customers can book")).toBeInTheDocument();

    served.setup = status({
      checks: [
        check("identity", true),
        check("services", true, { count: 1 }),
        check("team", true, { count: 1 }),
        check("bookable", true, { count: 1, detail: { missingServices: 0, missingHours: 0 } }),
        { key: "shop_hours", ok: true, blocking: false, count: 7 },
        { key: "branding", ok: true, blocking: false }
      ]
    });

    const { container } = renderWith(<SetupBanner />);
    /* Nothing to nag about — an owner running their day must not be told to
       finish setting up a shop that is already open. */
    await vi.waitFor(() => expect(container.textContent).toBe(""));
  });
});

describe("week-of-hours conversion", () => {
  /* mssql serialises SQL `time` as a full ISO datetime, while
     getBarberAvailability CONVERTs to "HH:MM". Both feed the same editor, and
     getting this wrong has shipped four times before. */
  it("reads a raw time(7) from the shop's hours", () => {
    const week = weekFromShopHours([
      { DayOfWeek: 1, OpenTime: "1970-01-01T09:00:00.000Z", CloseTime: "1970-01-01T18:00:00.000Z", IsClosed: false }
    ]);

    expect(week[1]).toMatchObject({ start: "09:00", end: "18:00", active: true });
  });

  it("reads an already-formatted string from a barber's availability", () => {
    const week = weekFromBarberHours([{ DayOfWeek: 1, StartTime: "09:00", EndTime: "18:00" }]);
    expect(week[1]).toMatchObject({ start: "09:00", end: "18:00", active: true });
  });

  it("treats a day the server did not return as a day off", () => {
    const week = weekFromBarberHours([{ DayOfWeek: 1, StartTime: "09:00", EndTime: "18:00" }]);
    expect(week[0].active).toBe(false);
    /* And sending it back omits that day, which is how the server records it. */
    expect(barberDaysFromWeek(week).map((d) => d.dayOfWeek)).toEqual([1]);
  });

  it("flags a day whose end is not after its start", () => {
    const week = weekFromBarberHours([{ DayOfWeek: 3, StartTime: "18:00", EndTime: "09:00" }]);
    expect(invalidDays(week)).toEqual([3]);
  });
});

describe("BarberHoursEditor", () => {
  it("keys its draft to the barber, so switching never shows the last one's rota", async () => {
    served.availability = [{ DayOfWeek: 1, StartTime: "09:00", EndTime: "18:00" }];
    renderWith(<BarberHoursEditor barberId="b-1" />);

    expect(await screen.findByLabelText(/Monday.*Opens/)).toHaveValue("09:00");
    /* Sunday was not returned, so it must render as closed rather than
       inheriting a default of open. */
    expect(screen.queryByLabelText(/Sunday.*Opens/)).not.toBeInTheDocument();
  });
});

describe("step ordering", () => {
  it("sends an owner to the first blocking gap, and to the end once there is none", () => {
    expect(firstIncompleteStep(status())).toBe("services");
    expect(firstIncompleteStep({ blockers: [], checks: [] })).toBe("ready");
    expect(firstIncompleteStep({ blockers: ["bookable"], checks: [] })).toBe("assign");
  });
});
