import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { I18nProvider } from "../../i18n";
import publicBookingReducer from "../../features/publicBooking/publicBookingSlice";

/*
 * Smoke tests for the public (QR / Instagram) pages.
 *
 * These three screens are the first thing most customers ever see of Ajmal,
 * and none of them is reachable from a signed-in session — so a runtime error
 * here would only ever surface in front of a real customer standing in a shop.
 * These prove they mount, fetch, and put the shop's actual numbers on screen.
 *
 * publicApi is mocked at the module boundary rather than with a fake server:
 * what matters is that each screen asks for the right things and renders what
 * comes back.
 */

vi.mock("../../services/publicApi", () => {
  const get = vi.fn();
  const post = vi.fn();
  const patch = vi.fn();
  return {
    default: { get, post, patch },
    setPublicAuthToken: vi.fn()
  };
});

import publicApi from "../../services/publicApi";
import PublicShop from "./PublicShop";
import FindShop from "./FindShop";
import PublicQueue from "./PublicQueue";

const SHOP = {
  Id: "shop-1",
  Name: "Hamra Barber",
  Slug: "hamra-barber",
  Area: "Hamra",
  Currency: "USD",
  IsVerified: true,
  IsOpenNow: true,
  IsClosedToday: false,
  HoursConfigured: true,
  OpensAt: "09:00:00",
  ClosesAt: "19:00:00",
  WalkInAvailable: true,
  MinWaitMinutes: 20,
  BarbersOnDutyNow: 2,
  AppointmentsAvailableToday: true,
  MinPrice: 15,
  MaxPrice: 30,
  AverageRating: 4.6,
  ReviewsCount: 37,
  CancellationPolicyHours: 24,
  DepositAmount: null,
  IsWhishPaymentEnabled: true,
  IsCreditCardPaymentEnabled: false
};

const SERVICES = [
  { Id: "svc-1", Name: "Fade", DurationMinutes: 45, Price: 20, IsActive: true }
];

const BARBERS = [
  { barberId: "b-1", userId: "u-1", fullName: "Sami", serviceIds: ["svc-1"], isAvailable: true }
];

const QUEUE_STATS = [
  {
    barberId: "b-1",
    barberName: "Sami",
    estimatedWaitMinutes: 20,
    isAcceptingWalkIns: true,
    isWithinHours: true,
    isWorkingToday: true
  }
];

const REVIEWS = {
  averageRating: 4.6,
  reviewsCount: 37,
  breakdown: { 1: 1, 2: 0, 3: 2, 4: 9, 5: 25 },
  reviews: [
    { id: "r-1", rating: 5, comment: "Best fade in Beirut", customerName: "Karim", barberName: "Sami" }
  ]
};

/* Routes the public pages request, keyed by URL suffix. */
function routeResponse(url) {
  if (url.endsWith("/public/tenants")) return { data: { data: [SHOP] } };
  if (url.includes("/services")) return { data: { data: SERVICES } };
  if (url.includes("/barbers")) return { data: { data: BARBERS } };
  if (url.includes("/queue-stats")) return { data: { data: QUEUE_STATS } };
  if (url.includes("/reviews")) return { data: { data: REVIEWS } };
  if (url.includes("/gallery")) return { data: { data: [] } };
  if (url.includes("/promotions")) return { data: { data: [] } };
  if (url.includes("/hours")) return { data: { data: [] } };
  if (url.includes("/queue/me/")) return { data: { inQueue: false } };
  if (url.includes("/public/tenants/")) return { data: { data: SHOP } };
  return { data: { data: null } };
}

function renderAt(path, element, routePath) {
  const store = configureStore({ reducer: { publicBooking: publicBookingReducer } });

  return render(
    <Provider store={store}>
      <I18nProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={routePath} element={element} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </Provider>
  );
}

beforeEach(() => {
  publicApi.get.mockImplementation((url) => Promise.resolve(routeResponse(url)));
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("PublicShop — the QR landing page", () => {
  it("shows the shop, its live wait and both ways to reserve", async () => {
    renderAt("/book/hamra-barber", <PublicShop />, "/book/:tenantSlug");

    expect(await screen.findByRole("heading", { name: "Hamra Barber" })).toBeInTheDocument();

    /* The availability pill is the reason this page exists — an honest range,
       not a single false-precision number. */
    const waits = await screen.findAllByText(/About \d+–\d+ min/);
    expect(waits.length).toBeGreaterThan(0);

    expect(await screen.findByText("Book appointment")).toBeInTheDocument();
    expect(await screen.findByText("Join queue")).toBeInTheDocument();
  });

  it("renders the price list in the shop's currency", async () => {
    renderAt("/book/hamra-barber", <PublicShop />, "/book/:tenantSlug");

    expect(await screen.findByText("Fade")).toBeInTheDocument();
    expect(await screen.findByText("$20")).toBeInTheDocument();
  });

  it("shows the rating and review count, not a zero-star placeholder", async () => {
    renderAt("/book/hamra-barber", <PublicShop />, "/book/:tenantSlug");

    /* The score appears twice by design — next to the name, and again as the
       headline of the ratings breakdown. */
    expect((await screen.findAllByText("4.6")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/37 reviews/)).length).toBeGreaterThan(0);
  });

  it("requests every section the page renders", async () => {
    renderAt("/book/hamra-barber", <PublicShop />, "/book/:tenantSlug");

    await waitFor(() => {
      const urls = publicApi.get.mock.calls.map(([url]) => url);
      for (const suffix of ["/services", "/barbers", "/queue-stats", "/hours", "/gallery", "/reviews", "/promotions"]) {
        expect(urls.some((url) => url.includes(suffix)), `never requested ${suffix}`).toBe(true);
      }
    });
  });

  it("offers a way out when the slug is unknown — stale posters outlive shops", async () => {
    publicApi.get.mockImplementation((url) =>
      url.includes("/public/tenants/") && !url.includes("/services")
        ? Promise.reject({ response: { data: { message: "Shop not found" } } })
        : Promise.resolve(routeResponse(url))
    );

    renderAt("/book/gone-away", <PublicShop />, "/book/:tenantSlug");

    expect(await screen.findByText("We can't find this shop")).toBeInTheDocument();
    expect(await screen.findByText("Find a barber")).toBeInTheDocument();
  });
});

describe("FindShop — the public directory", () => {
  it("renders shops as full cards with their availability", async () => {
    renderAt("/book", <FindShop />, "/book");

    expect(await screen.findByText("Hamra Barber")).toBeInTheDocument();
    /* The old version dropped every one of these on the floor. */
    expect(await screen.findByText(/About \d+–\d+ min/)).toBeInTheDocument();
    expect(await screen.findByText("$15–$30")).toBeInTheDocument();
    expect(await screen.findByText("1 shops")).toBeInTheDocument();
  });
});

describe("PublicQueue — the guest tracker", () => {
  it("tells a guest with no saved session that the link expired", async () => {
    renderAt("/book/hamra-barber/queue", <PublicQueue />, "/book/:tenantSlug/queue");

    expect(await screen.findByText("This link has expired")).toBeInTheDocument();
  });

  it("says the turn has passed rather than showing an empty tracker", async () => {
    /* A restored guest token, but the server reports them out of the line —
       the case that used to render "#undefined in line". */
    window.sessionStorage.setItem(
      "ajmal_guest_session",
      JSON.stringify({ token: "guest-token", slug: "hamra-barber", queue: { tenantId: "shop-1" } })
    );

    renderAt("/book/hamra-barber/queue", <PublicQueue />, "/book/:tenantSlug/queue");

    expect(await screen.findByText("You're no longer in the line")).toBeInTheDocument();
    expect(screen.queryByText(/#undefined/)).not.toBeInTheDocument();
  });

  it("renders the position and ETA when the guest is in line", async () => {
    window.sessionStorage.setItem(
      "ajmal_guest_session",
      JSON.stringify({ token: "guest-token", slug: "hamra-barber", queue: { tenantId: "shop-1" } })
    );

    publicApi.get.mockImplementation((url) =>
      url.includes("/queue/me/")
        ? Promise.resolve({
            data: {
              inQueue: true,
              queueId: "q-1",
              position: 3,
              waitTime: 25,
              statusId: 1,
              barberName: "Sami",
              tenantName: "Hamra Barber",
              totalDuration: 45,
              services: [{ name: "Fade", price: 20, duration: 45 }]
            }
          })
        : Promise.resolve(routeResponse(url))
    );

    renderAt("/book/hamra-barber/queue", <PublicQueue />, "/book/:tenantSlug/queue");

    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(await screen.findByText(/About \d+–\d+ min/)).toBeInTheDocument();
    expect(await screen.findByText("Sami")).toBeInTheDocument();
    /* Polling, not a socket — the page must not imply it is live. */
    expect(await screen.findByText(/Last checked/)).toBeInTheDocument();
  });
});
