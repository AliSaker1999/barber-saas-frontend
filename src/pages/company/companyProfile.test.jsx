import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../i18n";

import companyReducer from "../../features/company/companySlice";
import servicesReducer from "../../features/services/servicesSlice";
import loyaltyReducer from "../../features/loyalty/loyaltySlice";
import locationReducer from "../../features/location/locationSlice";

/*
 * The shop profile.
 *
 * Every test here is a thing the old screen got wrong, not a thing the new one
 * looks like. Deposit rules that never fire, a loyalty programme that can
 * never pay out, half a map pin, and a Delete with no confirmation behind it.
 */

const served = { profile: null, services: [], rewards: [] };
const calls = { patch: [], delete: [] };

vi.mock("../../services/api", () => ({
  default: {
    get: vi.fn((url) => {
      if (url === "/tenants/profile") return Promise.resolve({ data: { data: served.profile } });
      if (url === "/services") return Promise.resolve({ data: { data: served.services } });
      if (url === "/loyalty/rewards") return Promise.resolve({ data: { data: served.rewards } });
      return Promise.resolve({ data: { data: [] } });
    }),
    patch: vi.fn((url, body) => {
      calls.patch.push({ url, body });
      return Promise.resolve({ data: { data: { ...served.profile, ...body } } });
    }),
    post: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    delete: vi.fn((url) => {
      calls.delete.push({ url });
      return Promise.resolve({ data: {} });
    })
  }
}));

vi.mock("react-hot-toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() }
}));

import CompanyProfile from "./CompanyProfile";
import { toast } from "react-hot-toast";

const profile = (overrides = {}) => ({
  Id: "t-1",
  Name: "Ajmal Barbers",
  NameAr: "",
  Slug: "ajmal-barbers",
  City: "Beirut",
  Area: "Hamra",
  Phone: "03123456",
  Currency: "USD",
  Email: "",
  WebsiteUrl: "",
  TaxNumber: "",
  RegistrationNumber: "",
  Street: "",
  Building: "",
  Floor: "",
  GoogleMapLink: "",
  Latitude: null,
  Longitude: null,
  LogoUrl: "",
  CoverImageUrl: "",
  MaxAdvanceBookingDays: 30,
  AllowSameDayBooking: true,
  CancellationPolicyHours: 24,
  WhishPhoneNumber: "03999888",
  IsWhishPaymentEnabled: true,
  IsCreditCardPaymentEnabled: false,
  LoyaltyEnabled: true,
  LoyaltyAllowRedemption: true,
  DepositAmount: null,
  DepositRequireAll: false,
  DepositRequireAfterNoShows: false,
  DepositNoShowThreshold: null,
  DepositRequireForNewCustomers: false,
  DepositNewCustomerVisitThreshold: null,
  ...overrides
});

function renderScreen() {
  const store = configureStore({
    reducer: {
      company: companyReducer,
      services: servicesReducer,
      loyalty: loyaltyReducer,
      location: locationReducer,
      auth: (state = { user: { id: "u-1", roles: ["ADMIN"], tenantId: "t-1" } }) => state
    }
  });

  return render(
    <Provider store={store}>
      <I18nProvider>
        <MemoryRouter>
          <CompanyProfile />
        </MemoryRouter>
      </I18nProvider>
    </Provider>
  );
}

/* Sections start collapsed — the page is a summary until you open one. */
async function openSection(name) {
  await userEvent.click(await screen.findByRole("button", { name: new RegExp(name) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  calls.patch = [];
  calls.delete = [];
  served.profile = profile();
  served.services = [
    { Id: "s-1", Name: "Fade", Price: 20, DurationMinutes: 30, IsActive: true, LoyaltyPointsEarned: 10 },
    { Id: "s-2", Name: "Beard", Price: 10, DurationMinutes: 15, IsActive: true, LoyaltyPointsEarned: 0 }
  ];
  served.rewards = [];
});

describe("deposit rules that could never fire", () => {
  it("refuses to save a rule with no deposit amount behind it", async () => {
    renderScreen();
    await openSection("Payments and deposits");

    await userEvent.click(screen.getByRole("switch", { name: /Ask everyone/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    /* deposit-policy.ts returns early on a null amount, so the old screen
       could show "Enabled" for a rule that charged nobody. */
    expect(
      await screen.findByText("Set a deposit amount, or switch the rules below off.")
    ).toBeInTheDocument();
    expect(calls.patch).toHaveLength(0);
  });

  it("warns as soon as a rule is switched on with no amount, before saving", async () => {
    renderScreen();
    await openSection("Payments and deposits");

    await userEvent.click(screen.getByRole("switch", { name: /Ask everyone/ }));

    expect(
      await screen.findByText(/none of these rules do anything/i)
    ).toBeInTheDocument();
  });

  it("refuses a no-show rule with no threshold, which the server would skip", async () => {
    served.profile = profile({ DepositAmount: "5.00" });
    renderScreen();
    await openSection("Payments and deposits");

    await userEvent.click(screen.getByRole("switch", { name: /Ask after no-shows/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Set how many no-shows trigger the deposit.")
    ).toBeInTheDocument();
    expect(calls.patch).toHaveLength(0);
  });

  it("sends the amount and the threshold together once both are set", async () => {
    served.profile = profile({ DepositAmount: "5.00" });
    renderScreen();
    await openSection("Payments and deposits");

    await userEvent.click(screen.getByRole("switch", { name: /Ask after no-shows/ }));
    await userEvent.type(await screen.findByLabelText(/No-shows before a deposit/), "3");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => expect(calls.patch).toHaveLength(1));
    expect(calls.patch[0].body.depositAmount).toBe(5);
    expect(calls.patch[0].body.depositRequireAfterNoShows).toBe(true);
    expect(calls.patch[0].body.depositNoShowThreshold).toBe(3);
  });
});

describe("half a map pin", () => {
  it("refuses a latitude with no longitude", async () => {
    renderScreen();
    await openSection("Address and map");

    await userEvent.type(await screen.findByLabelText("Latitude"), "33.89");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Enter both latitude and longitude, or leave both empty.")
    ).toBeInTheDocument();
    expect(calls.patch).toHaveLength(0);
  });

  it("refuses a latitude outside the range the map can mean", async () => {
    renderScreen();
    await openSection("Address and map");

    await userEvent.type(await screen.findByLabelText("Latitude"), "3389");
    await userEvent.type(screen.getByLabelText("Longitude"), "35.5");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Latitude has to be between -90 and 90.")
    ).toBeInTheDocument();
    expect(calls.patch).toHaveLength(0);
  });
});

describe("a loyalty programme that can pay out", () => {
  it("says when no service awards points, so no reward is reachable", async () => {
    served.services = served.services.map((s) => ({ ...s, LoyaltyPointsEarned: 0 }));
    renderScreen();
    await openSection("Loyalty");

    expect(
      await screen.findByText(/None of your services award points/)
    ).toBeInTheDocument();
  });

  it("shows what each reward costs and what its service earns", async () => {
    served.rewards = [
      {
        Id: "r-1",
        ServiceId: "s-1",
        ServiceName: "Fade",
        PointsRequired: 100,
        IsActive: true,
        LoyaltyPointsEarned: 10
      }
    ];
    renderScreen();
    await openSection("Loyalty");

    /* Both halves of the arithmetic on one row: ten visits to a free fade.
       getTenantRewards has always returned this and nothing rendered it. */
    expect(await screen.findByText("100 points to redeem")).toBeInTheDocument();
    expect(screen.getByText("Earns 10 points a visit")).toBeInTheDocument();
  });

  it("calls out a reward whose own service earns nothing", async () => {
    served.rewards = [
      {
        Id: "r-2",
        ServiceId: "s-2",
        ServiceName: "Beard",
        PointsRequired: 50,
        IsActive: true,
        LoyaltyPointsEarned: 0
      }
    ];
    renderScreen();
    await openSection("Loyalty");

    expect(await screen.findByText("This service earns no points")).toBeInTheDocument();
  });

  it("persists a loyalty switch on the tap, not via a Save button elsewhere", async () => {
    served.profile = profile({ LoyaltyEnabled: false });
    renderScreen();
    await openSection("Loyalty");

    await userEvent.click(await screen.findByRole("switch", { name: /Loyalty programme/ }));

    /* The old card rendered outside its form element, so these two switches
       only ever saved because the page header called handleSubmit itself. */
    await vi.waitFor(() => expect(calls.patch).toHaveLength(1));
    expect(calls.patch[0].body).toEqual({ loyaltyEnabled: true });
  });
});

describe("deleting a reward", () => {
  beforeEach(() => {
    served.rewards = [
      {
        Id: "r-1",
        ServiceId: "s-1",
        ServiceName: "Fade",
        PointsRequired: 100,
        IsActive: true,
        LoyaltyPointsEarned: 10
      }
    ];
  });

  it("names the reward and offers switching it off instead", async () => {
    renderScreen();
    await openSection("Loyalty");

    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

    expect(await screen.findByText(/Delete the Fade reward\?/)).toBeInTheDocument();
    expect(screen.getByText(/Turn it off instead/)).toBeInTheDocument();
  });

  it("surfaces the refusal instead of logging it to a console nobody reads", async () => {
    const api = (await import("../../services/api")).default;
    api.delete.mockImplementationOnce(() =>
      Promise.reject({
        response: { data: { message: "This reward has been redeemed 4 times." } }
      })
    );

    renderScreen();
    await openSection("Loyalty");

    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
    const sheet = screen.getByRole("dialog");
    await userEvent.click(within(sheet).getByRole("button", { name: "Delete" }));

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("This reward has been redeemed 4 times.")
    );
  });
});

describe("the collapsed page as a status board", () => {
  it("summarises what is set without opening anything", async () => {
    /* mssql returns DECIMAL columns as strings and GET /tenants/profile is a
       SELECT t.*, so this is the shape the screen really receives — a number
       here would let a string bug through. */
    served.profile = profile({
      DepositAmount: "5.00",
      Latitude: "33.893791",
      Longitude: "35.501776",
      LogoUrl: "https://example.test/logo.png",
      CoverImageUrl: ""
    });
    renderScreen();

    expect(await screen.findByText("Ajmal Barbers · Beirut")).toBeInTheDocument();
    expect(screen.getByText("Logo only — no cover yet")).toBeInTheDocument();
    expect(screen.getByText("Pinned on the map")).toBeInTheDocument();
    expect(screen.getByText(/\$5 deposit/)).toBeInTheDocument();
    expect(screen.getByText("Up to 30 days ahead, 24h to cancel")).toBeInTheDocument();
  });
});
