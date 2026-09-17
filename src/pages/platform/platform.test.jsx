import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../i18n";

import platformTenantsReducer from "../../features/platformTenants/platformTenantsSlice";
import platformCustomersReducer from "../../features/platformCustomers/platformCustomersSlice";
import activityLogReducer from "../../features/activityLog/activityLogSlice";
import reportsReducer from "../../features/reports/reportsSlice";

/*
 * Ajmal's own staff tooling.
 *
 * These pages are English-only by decision, so nothing here checks copy for
 * translation. Every test pins a defect: an audit log that reported itself
 * empty when it was unreachable, a password-reset dialog that white-screened
 * the page it sat on, a save that appeared to do nothing, and the highest
 * blast-radius button in the product going off on a single click.
 */

const served = { tenants: [], customers: [], admins: {}, log: null };
const calls = { patch: [], post: [] };
const fail = { get: null, patch: null };

vi.mock("../../services/api", () => ({
  default: {
    get: vi.fn((url) => {
      if (fail.get && url.includes(fail.get)) {
        return Promise.reject({ response: { data: { message: "Upstream is down." } } });
      }
      if (url === "/tenants") return Promise.resolve({ data: { data: served.tenants } });
      if (url === "/customers") return Promise.resolve({ data: { data: served.customers } });
      if (url.includes("/admin")) {
        const id = url.split("/")[2];
        return Promise.resolve({ data: { data: served.admins[id] || null } });
      }
      if (url.includes("activity-log")) {
        return Promise.resolve({ data: { data: served.log || { items: [], total: 0 } } });
      }
      return Promise.resolve({ data: { data: [] } });
    }),
    patch: vi.fn((url, body) => {
      calls.patch.push({ url, body });
      if (fail.patch && url.includes(fail.patch)) {
        return Promise.reject({
          response: { data: { message: "That password is too common." } }
        });
      }
      return Promise.resolve({ data: { success: true } });
    }),
    post: vi.fn((url, body) => {
      calls.post.push({ url, body });
      return Promise.resolve({ data: { data: {} } });
    })
  }
}));

import PlatformTenants from "./Tenants";
import PlatformCustomers from "./Customers";
import ActivityLog from "./ActivityLog";

function renderScreen(element) {
  const store = configureStore({
    reducer: {
      platformTenants: platformTenantsReducer,
      platformCustomers: platformCustomersReducer,
      activityLog: activityLogReducer,
      reports: reportsReducer,
      auth: (state = { user: { id: "u-1", roles: ["SUPER_ADMIN"] } }) => state
    }
  });

  return render(
    <Provider store={store}>
      <I18nProvider>
        <MemoryRouter>{element}</MemoryRouter>
      </I18nProvider>
    </Provider>
  );
}

const tenant = (overrides = {}) => ({
  Id: "t-1",
  Name: "Cedar Cuts",
  Slug: "cedar-cuts",
  IsActive: true,
  PlanId: null,
  PlanName: null,
  PlanMonthlyPrice: null,
  SubscriptionRenewsAt: null,
  ...overrides
});

beforeEach(() => {
  vi.clearAllMocks();
  calls.patch = [];
  calls.post = [];
  fail.get = null;
  fail.patch = null;
  served.tenants = [tenant()];
  served.customers = [];
  served.admins = {};
  served.log = { items: [], total: 0 };
});

describe("an audit log that does not lie about being empty", () => {
  it("shows the failure instead of 'No activity found'", async () => {
    fail.get = "activity-log";
    renderScreen(<ActivityLog />);

    /* The component destructured everything from the slice except `error`, so
       a 500 rendered as an empty state on the one screen whose entire job is
       to be trustworthy about what happened. */
    expect(await screen.findByText("Upstream is down.")).toBeInTheDocument();
    expect(screen.queryByText(/No activity recorded yet/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nothing matches these filters/)).not.toBeInTheDocument();
  });

  it("still says 'nothing recorded' when the fetch genuinely returns nothing", async () => {
    renderScreen(<ActivityLog />);

    expect(await screen.findByText("No activity recorded yet")).toBeInTheDocument();
  });
});

describe("taking a shop offline", () => {
  it("asks first, and names what actually happens", async () => {
    renderScreen(<PlatformTenants />);

    await userEvent.click(await screen.findByRole("button", { name: "Deactivate" }));

    expect(await screen.findByText("Take Cedar Cuts offline?")).toBeInTheDocument();
    expect(
      screen.getByText(/Everyone who works at this shop stops being able to log in/)
    ).toBeInTheDocument();
    /* Nothing sent until the second, deliberate tap. */
    expect(calls.patch).toHaveLength(0);
  });

  it("only sends once confirmed", async () => {
    renderScreen(<PlatformTenants />);

    await userEvent.click(await screen.findByRole("button", { name: "Deactivate" }));
    const sheet = await screen.findByRole("dialog");
    await userEvent.click(within(sheet).getByRole("button", { name: "Take it offline" }));

    await vi.waitFor(() => expect(calls.patch).toHaveLength(1));
    expect(calls.patch[0].url).toBe("/tenants/t-1/deactivate");
  });
});

describe("failures that used to go nowhere", () => {
  it("surfaces a rejected deactivate instead of silently doing nothing", async () => {
    fail.patch = "deactivate";
    renderScreen(<PlatformTenants />);

    await userEvent.click(await screen.findByRole("button", { name: "Deactivate" }));
    const sheet = await screen.findByRole("dialog");
    await userEvent.click(within(sheet).getByRole("button", { name: "Take it offline" }));

    /* The slice had no error field and no rejected case for any mutation. */
    expect(await screen.findByText("That password is too common.")).toBeInTheDocument();
  });

  it("renders a failed password reset as a sentence, not as a crash", async () => {
    served.customers = [
      { Id: "c-1", FullName: "Rami Nasr", Email: "rami@example.com", IsActive: true }
    ];
    fail.patch = "reset-password";
    renderScreen(<PlatformCustomers />);

    await userEvent.click(await screen.findByRole("button", { name: "Reset password" }));
    const sheet = await screen.findByRole("dialog");
    await userEvent.type(within(sheet).getByLabelText("New password"), "abcd1234");
    await userEvent.click(within(sheet).getByRole("button", { name: "Reset password" }));

    /* The thunk had no rejectWithValue, so `.unwrap()` rejected with an object
       and rendering it as a React child white-screened the whole page. */
    expect(await screen.findByText("That password is too common.")).toBeInTheDocument();
    expect(screen.getByText("Rami Nasr")).toBeInTheDocument();
  });

  it("refuses a short password before asking the server", async () => {
    served.customers = [
      { Id: "c-1", FullName: "Rami Nasr", Email: "rami@example.com", IsActive: true }
    ];
    renderScreen(<PlatformCustomers />);

    await userEvent.click(await screen.findByRole("button", { name: "Reset password" }));
    const sheet = await screen.findByRole("dialog");
    await userEvent.type(within(sheet).getByLabelText("New password"), "abc");
    await userEvent.click(within(sheet).getByRole("button", { name: "Reset password" }));

    expect(await screen.findByText("Use at least 8 characters.")).toBeInTheDocument();
    expect(calls.patch).toHaveLength(0);
  });
});

describe("a saved edit that is actually visible", () => {
  it("re-reads the list so the card stops showing the old value", async () => {
    served.customers = [
      { Id: "c-1", FullName: "Rami Nasr", Email: "rami@example.com", IsActive: true }
    ];
    renderScreen(<PlatformCustomers />);

    await userEvent.click(await screen.findByRole("button", { name: "Edit profile" }));
    const sheet = await screen.findByRole("dialog");
    const name = within(sheet).getByLabelText("Full name");
    await userEvent.clear(name);
    await userEvent.type(name, "Rami N.");

    /* The server answers the PATCH with nothing to merge, so the list has to be
       re-read. The old reducer spread the modal's camelCase form onto a
       PascalCase row, which added keys and changed nothing on screen. */
    served.customers = [
      { Id: "c-1", FullName: "Rami N.", Email: "rami@example.com", IsActive: true }
    ];
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Rami N.")).toBeInTheDocument();
  });
});

describe("rows that would have taken the page down", () => {
  it("survives a customer with no name", async () => {
    served.customers = [
      { Id: "c-1", FullName: null, Email: null, PhoneNumber: "03123456", IsActive: true },
      { Id: "c-2", FullName: "Rami Nasr", Email: "rami@example.com", IsActive: true }
    ];
    renderScreen(<PlatformCustomers />);

    /* `c.FullName.toLowerCase()` in the filter threw on the first row and took
       the whole list with it — on the page you would open to fix that record. */
    expect(await screen.findByText("Rami Nasr")).toBeInTheDocument();
    expect(screen.getByText("No name on file")).toBeInTheDocument();
  });
});
