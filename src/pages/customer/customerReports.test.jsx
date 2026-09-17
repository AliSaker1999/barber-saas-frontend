import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../i18n";

import reportsReducer from "../../features/reports/reportsSlice";
import barbersReducer from "../../features/barbers/barbersSlice";

/*
 * A customer's own stats.
 *
 * Three defects, two of which made the screen wrong and one of which made it
 * dishonest: it read a field the API does not return, divided by that same
 * missing field, and added money from different currencies together.
 */

const served = { dashboard: null };
const calls = { post: [] };

vi.mock("../../services/api", () => ({
  default: {
    get: vi.fn((url) => {
      if (url === "/reports/customer-dashboard")
        return Promise.resolve({ data: { data: served.dashboard } });
      return Promise.resolve({ data: { data: [] } });
    }),
    post: vi.fn((url, body) => {
      calls.post.push({ url, body });
      return Promise.resolve({ data: { data: { updated: false } } });
    }),
    patch: vi.fn(() => Promise.resolve({ data: { data: {} } }))
  }
}));

import CustomerReports from "./CustomerReports";

const dashboard = (overrides = {}) => ({
  stats: { TotalVisits: 8, CompletedCount: 6, NoShowCount: 1 },
  spendByCurrency: [{ Currency: "USD", TotalSpent: "240.00" }],
  shopSpending: [
    {
      TenantId: "t-1",
      TenantName: "Cedar Cuts",
      TenantNameAr: null,
      Currency: "USD",
      VisitCount: 5,
      TotalSpent: "140.00",
      LastVisit: "2026-09-01T10:00:00.000Z"
    }
  ],
  servicePrefs: [
    {
      ServiceId: "s-1",
      ServiceName: "Haircut",
      ServiceNameAr: null,
      TenantId: "t-1",
      TenantName: "Cedar Cuts",
      Count: 5
    }
  ],
  recentActivities: [],
  ...overrides
});

function renderScreen() {
  const store = configureStore({
    reducer: {
      reports: reportsReducer,
      barbers: barbersReducer,
      auth: (state = { user: { id: "u-1", roles: ["CUSTOMER"] } }) => state
    }
  });

  return render(
    <Provider store={store}>
      <I18nProvider>
        <MemoryRouter>
          <CustomerReports />
        </MemoryRouter>
      </I18nProvider>
    </Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  calls.post = [];
  served.dashboard = dashboard();
});

describe("reading the field the API actually returns", () => {
  it("shows the visit count, which used to render blank", async () => {
    renderScreen();

    /* The screen read stats.TotalAppointments; the query returns TotalVisits. */
    expect(await screen.findByText("8")).toBeInTheDocument();
  });

  it("computes reliability instead of always saying 0%", async () => {
    renderScreen();

    /* 6 of 8 = 75%. Dividing by the missing field pinned this at 0% forever. */
    expect(await screen.findByText("75%")).toBeInTheDocument();
  });

  it("says nothing rather than 0% for a customer with no visits", async () => {
    served.dashboard = dashboard({
      stats: { TotalVisits: 0, CompletedCount: 0, NoShowCount: 0 },
      spendByCurrency: [],
      shopSpending: [],
      servicePrefs: []
    });
    renderScreen();

    /* A customer with no visits is new, not unreliable. */
    expect(await screen.findByText("—")).toBeInTheDocument();
  });
});

describe("money from two currencies is two numbers", () => {
  it("never adds dollars to lira", async () => {
    served.dashboard = dashboard({
      spendByCurrency: [
        { Currency: "LBP", TotalSpent: "1800000.00" },
        { Currency: "USD", TotalSpent: "20.00" }
      ]
    });
    renderScreen();

    /* The old screen printed SUM(Price) across every shop behind a hardcoded
       "$", so these two became "$1,800,020". */
    expect(await screen.findByText("1,800,000 L.L.")).toBeInTheDocument();
    expect(screen.getByText("$20")).toBeInTheDocument();
    expect(screen.queryByText(/1,800,020/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Nothing here converts between currencies/)
    ).toBeInTheDocument();
  });

  it("labels a shop total in that shop's own currency", async () => {
    served.dashboard = dashboard({
      shopSpending: [
        {
          TenantId: "t-2",
          TenantName: "Tripoli Barbers",
          TenantNameAr: null,
          Currency: "LBP",
          VisitCount: 3,
          TotalSpent: "900000.00",
          LastVisit: "2026-09-01T10:00:00.000Z"
        }
      ]
    });
    renderScreen();

    expect(await screen.findByText("900,000 L.L.")).toBeInTheDocument();
  });
});

describe("links that go somewhere", () => {
  it("points a shop row at that shop", async () => {
    renderScreen();

    const link = await screen.findByRole("link", { name: /Cedar Cuts/ });
    expect(link).toHaveAttribute("href", "/customer/shop/t-1");
  });

  it("names the shop beside the service, which the query used to merge away", async () => {
    served.dashboard = dashboard({
      servicePrefs: [
        {
          ServiceId: "s-1",
          ServiceName: "Haircut",
          TenantId: "t-1",
          TenantName: "Cedar Cuts",
          Count: 5
        },
        {
          ServiceId: "s-9",
          ServiceName: "Haircut",
          TenantId: "t-2",
          TenantName: "Tripoli Barbers",
          Count: 2
        }
      ]
    });
    renderScreen();

    /* Grouped by s.Name, these two were one row. They are different services
       at different shops and different prices. */
    expect(await screen.findAllByText("Haircut")).toHaveLength(2);
    expect(screen.getByText("Tripoli Barbers")).toBeInTheDocument();
  });
});

describe("rating a visit from the history", () => {
  it("shows why the server refused instead of logging it to the console", async () => {
    served.dashboard = dashboard({
      recentActivities: [
        {
          Type: "Appointment",
          VisitId: "a-1",
          BarberId: "b-1",
          TenantName: "Cedar Cuts",
          Date: "2026-09-01T10:00:00.000Z",
          Status: "COMPLETED",
          Services: "Haircut",
          IsRated: false
        }
      ]
    });

    const api = (await import("../../services/api")).default;
    api.post.mockImplementationOnce(() =>
      Promise.reject({
        response: { data: { message: "You can only review a visit you completed." } }
      })
    );

    renderScreen();
    await userEvent.click(await screen.findByRole("button", { name: "Rate this visit" }));

    const sheet = await screen.findByRole("dialog");
    await userEvent.click(within(sheet).getByRole("button", { name: "Send review" }));

    expect(
      await screen.findByText("You can only review a visit you completed.")
    ).toBeInTheDocument();
  });

  it("marks a visit that was already rated rather than offering again", async () => {
    served.dashboard = dashboard({
      recentActivities: [
        {
          Type: "Walk-in",
          VisitId: "q-1",
          BarberId: "b-1",
          TenantName: "Cedar Cuts",
          Date: "2026-09-01T10:00:00.000Z",
          Status: "COMPLETED",
          Services: "Beard",
          IsRated: true
        }
      ]
    });
    renderScreen();

    expect(await screen.findByText("Rated")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rate this visit" })).not.toBeInTheDocument();
  });
});
