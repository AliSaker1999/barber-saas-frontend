import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../i18n";

import customersReducer from "../../features/customers/customersSlice";

/*
 * A shop's own customer list, and blocking one customer at this shop.
 *
 * These assert the behaviours the block exists for: the list's search and
 * blocked filter work over the fetched set, and blocking is a real
 * confirmation naming the actual consequence rather than a bare toggle —
 * matching the standard the rest of this redesign holds destructive actions
 * to.
 */

/* Every screen fetches on mount, so fixtures have to come back from the API —
   anything in preloadedState is overwritten by the first response. */
const served = { list: [], details: null };
const calls = { patch: [] };

vi.mock("../../services/api", () => ({
  default: {
    get: vi.fn((url) => {
      if (url === "/customers/tenant") return Promise.resolve({ data: { data: served.list } });
      if (url.endsWith("/details")) return Promise.resolve({ data: { data: served.details } });
      return Promise.resolve({ data: { data: [] } });
    }),
    patch: vi.fn((url, body) => {
      calls.patch.push({ url, body });
      return Promise.resolve({ data: { data: {} } });
    }),
    post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    delete: vi.fn(() => Promise.resolve({ data: {} }))
  }
}));

import Customers from "./Customers";
import CustomerModal from "../../components/CustomerModal";

const OWNER = { id: "u-1", fullName: "Owner", roles: ["ADMIN"], tenantId: "t-1" };

const customer = (overrides = {}) => ({
  CustomerId: "c-1",
  FullName: "Karim",
  Email: "karim@example.com",
  PhoneNumber: "03111222",
  IsActive: true,
  IsBlocked: false,
  LoyaltyPoints: 0,
  LastVisitAt: null,
  VisitCount: 0,
  TotalSpend: 0,
  ...overrides
});

function renderWith(ui, preloaded = {}) {
  const store = configureStore({
    reducer: {
      customers: customersReducer,
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
  calls.patch = [];
  served.list = [];
  served.details = null;
});

describe("Customers list", () => {
  it("shows every customer and searches by name", async () => {
    served.list = [customer(), customer({ CustomerId: "c-2", FullName: "Ali" })];
    renderWith(<Customers />);

    expect(await screen.findByText("Karim")).toBeInTheDocument();
    expect(screen.getByText("Ali")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("Search by name or phone"), "Ali");

    /* The filter is debounced, so Karim's disappearance is the thing worth
       waiting on rather than Ali's presence — Ali is on screen from the
       first, unfiltered render too. */
    await waitFor(() => {
      expect(screen.queryByText("Karim")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Ali")).toBeInTheDocument();
  });

  it("filters to only blocked customers", async () => {
    served.list = [customer(), customer({ CustomerId: "c-2", FullName: "Ali", IsBlocked: true })];
    renderWith(<Customers />);

    await screen.findByText("Karim");
    /* Exact text, not an accessible-name role query: the row itself is a
       button whose computed name also includes "Blocked at this shop" from
       the customer's own status pill, which a /Blocked/i role query matches
       too. */
    await userEvent.click(screen.getByText("Blocked").closest("button"));

    expect(await screen.findByText("Ali")).toBeInTheDocument();
    expect(screen.queryByText("Karim")).not.toBeInTheDocument();
  });

  it("shows an empty state distinct from a no-results-for-filter state", async () => {
    served.list = [];
    const { unmount } = renderWith(<Customers />);
    expect(await screen.findByText("No customers yet")).toBeInTheDocument();
    unmount();

    served.list = [customer()];
    renderWith(<Customers />);
    await screen.findByText("Karim");
    await userEvent.type(screen.getByPlaceholderText("Search by name or phone"), "nobody-matches-this");
    expect(await screen.findByText("No matches")).toBeInTheDocument();
  });
});

describe("CustomerModal block/unblock", () => {
  it("confirms before blocking, naming the real consequence", async () => {
    served.details = {
      Id: "c-1",
      FullName: "Karim",
      IsBlocked: false,
      NoShowCount: 0
    };

    renderWith(
      <CustomerModal isOpen onClose={() => {}} />,
      { customers: { selectedCustomer: served.details, loading: false, error: null, updateSuccess: false, list: { items: [], loading: false, error: null } } }
    );

    await userEvent.click(await screen.findByRole("button", { name: "Block at this shop" }));

    /* The consequence is named — not just "are you sure?" — and nothing has
       been sent yet. */
    expect(
      await screen.findByText(/will not be able to book or join the queue at this shop/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/account, bookings, and history at other shops are unaffected/i)
    ).toBeInTheDocument();
    expect(calls.patch).toHaveLength(0);

    /* Two buttons now read "Block at this shop" — the row action that opened
       the sheet, and the sheet's own confirm button. The confirm button is
       the one added last. */
    await userEvent.click(screen.getAllByRole("button", { name: "Block at this shop" }).pop());

    expect(calls.patch).toHaveLength(1);
    expect(calls.patch[0].url).toBe("/customers/c-1/block");
    expect(calls.patch[0].body).toEqual({ blocked: true });
  });

  it("offers Unblock, not Block, once a customer is already blocked", async () => {
    served.details = { Id: "c-1", FullName: "Karim", IsBlocked: true, NoShowCount: 0 };

    renderWith(
      <CustomerModal isOpen onClose={() => {}} />,
      { customers: { selectedCustomer: served.details, loading: false, error: null, updateSuccess: false, list: { items: [], loading: false, error: null } } }
    );

    expect(await screen.findByRole("button", { name: "Unblock at this shop" })).toBeInTheDocument();
    expect(screen.getByText("Blocked at this shop")).toBeInTheDocument();
  });

  it("does not offer the block action to anyone but an owner", async () => {
    served.details = { Id: "c-1", FullName: "Karim", IsBlocked: false, NoShowCount: 0 };

    const store = configureStore({
      reducer: {
        customers: customersReducer,
        auth: (state = { user: { ...OWNER, roles: ["BARBER"] } }) => state
      },
      preloadedState: {
        customers: {
          selectedCustomer: served.details,
          loading: false,
          error: null,
          updateSuccess: false,
          list: { items: [], loading: false, error: null }
        }
      }
    });

    render(
      <Provider store={store}>
        <I18nProvider>
          <MemoryRouter>
            <CustomerModal isOpen onClose={() => {}} />
          </MemoryRouter>
        </I18nProvider>
      </Provider>
    );

    await screen.findByText("Karim");
    expect(screen.queryByRole("button", { name: /block at this shop/i })).not.toBeInTheDocument();
  });
});
