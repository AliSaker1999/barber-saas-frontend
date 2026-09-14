import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../i18n";

import reportsReducer from "../../features/reports/reportsSlice";
import companyReducer from "../../features/company/companySlice";

/*
 * The owner analytics screen.
 *
 * The old version rendered the literal text "Invalid Date" for any shop with
 * no revenue in the last 30 days — checked against the real seeded shops, 4
 * of 5 hit this on a normal day. `summary.TotalRevenue.toLocaleString()` had
 * no null guard either; the SQL happens to always return 0, not null, today,
 * but nothing in this screen defended against that changing. Both get their
 * own tests rather than being covered incidentally. The other half of what
 * this screen exists to prove: money is rendered in the shop's own currency,
 * never a hardcoded $.
 */

const served = { dashboard: null, profile: { Currency: "USD" } };

vi.mock("../../services/api", () => ({
  default: {
    get: vi.fn((url) => {
      if (url === "/reports/tenant-dashboard") return Promise.resolve({ data: { data: served.dashboard } });
      if (url === "/tenants/profile") return Promise.resolve({ data: { data: served.profile } });
      return Promise.resolve({ data: { data: [] } });
    }),
    post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    patch: vi.fn(() => Promise.resolve({ data: { data: {} } }))
  }
}));

import AdminReports from "./AdminReports";

const OWNER = { id: "u-1", fullName: "Owner", roles: ["ADMIN"], tenantId: "t-1" };

/* A shop with no lifetime revenue and no activity in the last 30 days — the
   exact shape a new shop's real first dashboard load has. */
const bareDashboard = () => ({
  summary: {
    TotalRevenue: null,
    CompletedApptCount: 0,
    CompletedQueueCount: 0,
    NoShowApptCount: 0,
    NoShowQueueCount: 0,
    CancelledApptCount: 0,
    CancelledQueueCount: 0
  },
  barbers: [],
  services: [],
  dailyRevenue: [],
  topCustomers: [],
  acquisitionSources: []
});

function renderWith() {
  const store = configureStore({
    reducer: {
      reports: reportsReducer,
      company: companyReducer,
      auth: (state = { user: OWNER }) => state
    }
  });

  return render(
    <Provider store={store}>
      <I18nProvider>
        <MemoryRouter>
          <AdminReports />
        </MemoryRouter>
      </I18nProvider>
    </Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  served.dashboard = null;
  served.profile = { Currency: "USD" };
});

describe("a shop with no lifetime activity", () => {
  it("does not crash on a null TotalRevenue", async () => {
    served.dashboard = bareDashboard();
    renderWith();

    /* The old screen called .toLocaleString() on this with no guard, relying
       entirely on the SQL's own ISNULL to never hand it a real null.
       formatMoney's own null handling renders an em dash instead, so the
       screen no longer depends on that staying true. */
    expect(await screen.findByText("—")).toBeInTheDocument();
  });

  it("never renders the literal string 'Invalid Date' for an empty trend", async () => {
    served.dashboard = bareDashboard();
    renderWith();

    await screen.findByText("Analytics");
    expect(screen.queryByText(/Invalid Date/i)).not.toBeInTheDocument();
    expect(screen.getByText("No revenue in the last 30 days yet.")).toBeInTheDocument();
  });
});

describe("currency", () => {
  it("renders revenue in the shop's own currency, not a hardcoded $", async () => {
    served.dashboard = { ...bareDashboard(), summary: { ...bareDashboard().summary, TotalRevenue: 1500000 } };
    served.profile = { Currency: "LBP" };
    renderWith();

    /* formatMoney renders LBP with an "L.L." suffix and no $ anywhere near
       the figure — the bug this replaces mislabelled every LBP shop's real
       numbers as dollars. */
    expect(await screen.findByText(/1,500,000\s*L\.L\./)).toBeInTheDocument();
    expect(screen.queryByText(/^\$/)).not.toBeInTheDocument();
  });

  it("renders USD with a $ when that is the shop's real currency", async () => {
    served.dashboard = { ...bareDashboard(), summary: { ...bareDashboard().summary, TotalRevenue: 250 } };
    served.profile = { Currency: "USD" };
    renderWith();

    expect(await screen.findByText("$250")).toBeInTheDocument();
  });
});

describe("acquisition breakdown", () => {
  it("shows real signup sources by name, distinguishing a walk-in from a bare link", async () => {
    served.dashboard = {
      ...bareDashboard(),
      acquisitionSources: [
        { Source: "walk_in", CustomerCount: 3 },
        { Source: "direct", CustomerCount: 1 },
        { Source: "qr", CustomerCount: 2 }
      ]
    };
    renderWith();

    expect(await screen.findByText("Walk-in at the counter")).toBeInTheDocument();
    expect(screen.getByText("Direct link")).toBeInTheDocument();
    expect(screen.getByText("QR card")).toBeInTheDocument();
  });

  it("offers an explanation instead of an empty chart when nothing is tracked yet", async () => {
    served.dashboard = bareDashboard();
    renderWith();

    expect(await screen.findByText("No tracked signups yet")).toBeInTheDocument();
  });
});

describe("loading, error and refresh", () => {
  it("shows a retryable error rather than a blank screen", async () => {
    const api = (await import("../../services/api")).default;
    api.get.mockImplementation((url) => {
      if (url === "/reports/tenant-dashboard") {
        return Promise.reject({ response: { data: { message: "Server exploded" } } });
      }
      return Promise.resolve({ data: { data: served.profile } });
    });

    renderWith();
    expect(await screen.findByText("Server exploded")).toBeInTheDocument();
  });

  it("has a manual refresh action, which the old screen lacked once data loaded", async () => {
    served.dashboard = bareDashboard();
    renderWith();

    const refresh = await screen.findByRole("button", { name: "Refresh" });
    const api = (await import("../../services/api")).default;
    const callsBefore = api.get.mock.calls.length;

    await userEvent.click(refresh);

    expect(api.get.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
