import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../i18n";

import promotionsReducer from "../../features/promotions/promotionsSlice";
import servicesReducer from "../../features/services/servicesSlice";
import companyReducer from "../../features/company/companySlice";

/*
 * Offers.
 *
 * The point of the rebuild was not the styling. The form never sent a
 * serviceId, so every offer an owner created was shop-wide even though the
 * pricing engine has always scoped discounts per service — the feature was
 * built, load-bearing, and unreachable. Same for the Arabic title. Both get a
 * test each, because both are invisible in the markup.
 */

const served = { promotions: [], services: [] };
const calls = { post: [], patch: [], delete: [] };

vi.mock("../../services/api", () => ({
  default: {
    get: vi.fn((url) => {
      if (url === "/promotions") return Promise.resolve({ data: { data: served.promotions } });
      if (url.startsWith("/services")) return Promise.resolve({ data: { data: served.services } });
      if (url.includes("/tenants/profile")) return Promise.resolve({ data: { data: { Currency: "USD" } } });
      return Promise.resolve({ data: { data: [] } });
    }),
    post: vi.fn((url, body) => {
      calls.post.push({ url, body });
      return Promise.resolve({ data: { data: { Id: "new", ...body } } });
    }),
    patch: vi.fn((url, body) => {
      calls.patch.push({ url, body });
      return Promise.resolve({ data: { data: { Id: "p-1", ...body } } });
    }),
    delete: vi.fn((url) => {
      calls.delete.push({ url });
      return Promise.resolve({ data: {} });
    })
  }
}));

vi.mock("react-hot-toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() }
}));

import Promotions from "./Promotions";
import { toast } from "react-hot-toast";

const OWNER = { id: "u-1", fullName: "Owner", roles: ["ADMIN"], tenantId: "t-1" };

const promo = (overrides = {}) => ({
  Id: "p-1",
  Title: "Summer special",
  TitleAr: null,
  Description: null,
  DescriptionAr: null,
  DiscountPercent: 20,
  DiscountAmount: null,
  ServiceId: null,
  ServiceName: null,
  StartDate: "2026-06-01T00:00:00.000Z",
  EndDate: "2026-08-31T00:00:00.000Z",
  IsActive: true,
  ...overrides
});

function renderScreen() {
  const store = configureStore({
    reducer: {
      promotions: promotionsReducer,
      services: servicesReducer,
      company: companyReducer,
      auth: (state = { user: OWNER }) => state
    }
  });

  return render(
    <Provider store={store}>
      <I18nProvider>
        <MemoryRouter>
          <Promotions />
        </MemoryRouter>
      </I18nProvider>
    </Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  calls.post = [];
  calls.patch = [];
  calls.delete = [];
  served.promotions = [];
  served.services = [
    { Id: "s-1", Name: "Fade", Price: 20, DurationMinutes: 30, IsActive: true },
    { Id: "s-2", Name: "Beard", Price: 10, DurationMinutes: 15, IsActive: true }
  ];
});

describe("scoping an offer to one service", () => {
  it("sends the chosen serviceId, which the old form could never do", async () => {
    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: "New offer" }));
    await userEvent.type(await screen.findByLabelText("Title"), "Fade Friday");
    await userEvent.type(screen.getByLabelText("Amount"), "15");
    await userEvent.type(screen.getByLabelText("Runs from"), "2026-06-01");
    await userEvent.type(screen.getByLabelText("Runs until"), "2026-06-30");

    /* The picker is the whole feature: promotion-pricing.ts skips a promo
       whose ServiceId does not match the service being priced. */
    await userEvent.click(screen.getByRole("combobox", { name: "Applies to" }));
    await userEvent.click(await screen.findByRole("option", { name: "Fade" }));

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(calls.post).toHaveLength(1);
    expect(calls.post[0].body.serviceId).toBe("s-1");
  });

  it("sends null for a shop-wide offer, which is what the pricing engine expects", async () => {
    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: "New offer" }));
    await userEvent.type(await screen.findByLabelText("Title"), "Everything off");
    await userEvent.type(screen.getByLabelText("Amount"), "10");
    await userEvent.type(screen.getByLabelText("Runs from"), "2026-06-01");
    await userEvent.type(screen.getByLabelText("Runs until"), "2026-06-30");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(calls.post).toHaveLength(1);
    expect(calls.post[0].body.serviceId).toBeNull();
  });

  it("says on the row whether an offer is shop-wide or for one service", async () => {
    served.promotions = [
      promo(),
      promo({ Id: "p-2", Title: "Fade Friday", ServiceId: "s-1", ServiceName: "Fade" })
    ];
    renderScreen();

    expect(await screen.findByText("Every service")).toBeInTheDocument();
    expect(screen.getByText("Fade")).toBeInTheDocument();
  });
});

describe("Arabic offers", () => {
  it("sends the Arabic title, which the old form had no field for", async () => {
    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: "New offer" }));
    await userEvent.type(await screen.findByLabelText("Title"), "Summer special");
    await userEvent.type(screen.getByLabelText(/Title in Arabic/), "عرض الصيف");
    await userEvent.type(screen.getByLabelText("Amount"), "20");
    await userEvent.type(screen.getByLabelText("Runs from"), "2026-06-01");
    await userEvent.type(screen.getByLabelText("Runs until"), "2026-06-30");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(calls.post).toHaveLength(1);
    expect(calls.post[0].body.titleAr).toBe("عرض الصيف");
  });
});

describe("deleting an offer", () => {
  it("surfaces the server's refusal instead of silently leaving the row", async () => {
    served.promotions = [promo()];

    const api = (await import("../../services/api")).default;
    api.delete.mockImplementationOnce(() =>
      Promise.reject({
        response: { data: { message: "This promotion has already been used 3 times." } }
      })
    );

    renderScreen();
    await userEvent.click(await screen.findByRole("button", { name: /Delete/ }));
    await userEvent.click(screen.getAllByRole("button", { name: /Delete/ }).pop());

    /* The 409 explains itself; before this the rejection went nowhere and the
       row just stayed where it was. */
    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("This promotion has already been used 3 times.")
    );
  });

  it("names what it is deleting, and that turning it off is the alternative", async () => {
    served.promotions = [promo()];
    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: /Delete/ }));

    expect(await screen.findByText(/Delete Summer special\?/)).toBeInTheDocument();
    expect(screen.getByText(/Turn it off instead/i)).toBeInTheDocument();
  });
});

describe("validation", () => {
  it("refuses an end date before the start date", async () => {
    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: "New offer" }));
    await userEvent.type(await screen.findByLabelText("Title"), "Backwards");
    await userEvent.type(screen.getByLabelText("Amount"), "10");
    await userEvent.type(screen.getByLabelText("Runs from"), "2026-06-30");
    await userEvent.type(screen.getByLabelText("Runs until"), "2026-06-01");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("The end date has to be after the start date.")
    ).toBeInTheDocument();
    expect(calls.post).toHaveLength(0);
  });
});
