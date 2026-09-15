import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../i18n";

import companyReducer from "../../features/company/companySlice";

/*
 * Two currencies live on this screen and they are not the same currency.
 *
 * The plan price is what Ajmal charges the shop, and SubscriptionPlans has no
 * currency column — the platform bills everyone the same way. The picker below
 * it sets what the shop charges its own customers. Nothing converts between
 * them, so an LBP shop must still see its plan priced in dollars.
 */

const served = { profile: null, plans: [] };
const calls = { patch: [] };

vi.mock("../../services/api", () => ({
  default: {
    get: vi.fn((url) => {
      if (url === "/tenants/profile") return Promise.resolve({ data: { data: served.profile } });
      if (url.includes("plans")) return Promise.resolve({ data: { data: served.plans } });
      return Promise.resolve({ data: { data: {} } });
    }),
    patch: vi.fn((url, body) => {
      calls.patch.push({ url, body });
      return Promise.resolve({ data: { data: { ...served.profile, ...body } } });
    }),
    post: vi.fn(() => Promise.resolve({ data: { data: {} } }))
  }
}));

vi.mock("react-hot-toast", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("../../components/setup/ShopHoursEditor", () => ({
  default: () => <div data-testid="hours" />
}));

import Settings from "./Settings";

function renderScreen() {
  const store = configureStore({
    reducer: {
      company: companyReducer,
      auth: (state = { user: { id: "u-1", roles: ["ADMIN"], tenantId: "t-1" } }) => state
    }
  });

  return render(
    <Provider store={store}>
      <I18nProvider>
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      </I18nProvider>
    </Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  calls.patch = [];
  served.profile = {
    Id: "t-1",
    Name: "Ajmal Barbers",
    Currency: "LBP",
    PlanId: 1,
    PlanName: "Starter",
    PlanMonthlyPrice: "15.00"
  };
  served.plans = [
    { Id: 1, Name: "Starter", MonthlyPrice: "15.00", MinBarbers: 1, MaxBarbers: 3 },
    { Id: 2, Name: "Shop", MonthlyPrice: "40.00", MinBarbers: 4, MaxBarbers: null }
  ];
});

describe("two currencies, one screen", () => {
  it("prices the plan in dollars even when the shop prices in lira", async () => {
    renderScreen();

    /* The shop is on LBP; its plan is still billed by the platform in USD. */
    expect(await screen.findByText("$15 a month")).toBeInTheDocument();
    expect(screen.getByText("$40 a month")).toBeInTheDocument();
  });

  it("shows a worked example of each currency rather than just its name", async () => {
    renderScreen();

    /* Switching currency relabels prices, it does not convert them, so the
       sample is the only honest way to show what a customer will read. */
    expect(await screen.findByText("$20")).toBeInTheDocument();
    expect(screen.getByText("1,800,000 L.L.")).toBeInTheDocument();
  });

  it("sends only the currency when the shop switches", async () => {
    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: /Dollar|USD/i }));

    await vi.waitFor(() => expect(calls.patch).toHaveLength(1));
    expect(calls.patch[0].body).toEqual({ currency: "USD" });
  });
});

describe("plans", () => {
  it("marks the plan the shop is on and offers no button to re-buy it", async () => {
    renderScreen();

    expect(await screen.findByText("Current")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Choose" })).toHaveLength(1);
  });

  it("reads an open-ended tier as a range, not a missing number", async () => {
    renderScreen();

    expect(await screen.findByText("1-3 barbers")).toBeInTheDocument();
    expect(screen.getByText("4+ barbers")).toBeInTheDocument();
  });
});
