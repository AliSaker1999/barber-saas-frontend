import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../i18n";

import favoritesReducer from "../../features/favorites/favoritesSlice";
import notificationsReducer from "../../features/notifications/notificationsSlice";

/*
 * Two customer screens that were mostly emoji.
 *
 * Saving a shop led to `navigate("/customer")` — the home screen, not the shop
 * — and saved barbers were not tappable at all, which is the whole point of
 * saving one. The notification history made every row a clickable <div>, so
 * the entire list was unreachable by keyboard.
 */

const served = { favorites: [], notifications: [] };
const calls = { post: [], patch: [] };

vi.mock("../../services/api", () => ({
  default: {
    get: vi.fn((url) => {
      if (url === "/favorites") return Promise.resolve({ data: { data: served.favorites } });
      if (url === "/notifications")
        return Promise.resolve({
          data: {
            data: served.notifications,
            hasMore: false,
            unreadCount: served.notifications.filter((n) => !n.IsRead).length
          }
        });
      return Promise.resolve({ data: { data: [] } });
    }),
    post: vi.fn((url, body) => {
      calls.post.push({ url, body });
      return Promise.resolve({ data: { data: { isFavorite: false } } });
    }),
    patch: vi.fn((url) => {
      calls.patch.push({ url });
      return Promise.resolve({ data: { data: {} } });
    })
  }
}));

vi.mock("react-hot-toast", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import Favorites from "./Favorites";
import NotificationHistory from "./NotificationHistory";

function renderScreen(screenElement) {
  const store = configureStore({
    reducer: {
      favorites: favoritesReducer,
      notifications: notificationsReducer,
      auth: (state = { user: { id: "u-1", roles: ["CUSTOMER"] } }) => state
    }
  });

  return render(
    <Provider store={store}>
      <I18nProvider>
        <MemoryRouter>
          {screenElement}
        </MemoryRouter>
      </I18nProvider>
    </Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  calls.post = [];
  calls.patch = [];
  served.favorites = [];
  served.notifications = [];
});

describe("saved shops and barbers go somewhere", () => {
  beforeEach(() => {
    served.favorites = [
      {
        Id: "f-1",
        Type: "SHOP",
        TenantId: "t-1",
        TenantName: "Cedar Cuts",
        TenantCity: "Beirut",
        TenantArea: "Hamra",
        TenantLogo: null
      },
      {
        Id: "f-2",
        Type: "BARBER",
        BarberId: "b-1",
        BarberName: "Karim",
        BarberRating: "4.50",
        /* Resolved through the barber: a BARBER favourite is stored with a null
           TenantId, so the query coalesces it from Barbers.TenantId. */
        TenantId: "t-1",
        TenantName: "Cedar Cuts"
      }
    ];
  });

  it("links a saved shop to the shop, not to the home screen", async () => {
    renderScreen(<Favorites />);

    const link = await screen.findByRole("link", { name: /Cedar Cuts.*Hamra/s });
    expect(link).toHaveAttribute("href", "/customer/shop/t-1");
  });

  it("makes a saved barber tappable, and says which shop they cut at", async () => {
    renderScreen(<Favorites />);

    const link = await screen.findByRole("link", { name: /Karim/ });
    expect(link).toHaveAttribute("href", "/customer/shop/t-1");
  });

  it("gives the remove control a name instead of a bare heart", async () => {
    renderScreen(<Favorites />);

    /* The only accessible name used to be a `title` attribute on an emoji. */
    const remove = await screen.findByRole("button", {
      name: "Remove Cedar Cuts from favourites"
    });
    await userEvent.click(remove);

    expect(calls.post).toHaveLength(1);
    expect(calls.post[0].body).toEqual({ type: "SHOP", targetId: "t-1" });
  });

  it("renders no emoji", async () => {
    const { container } = renderScreen(<Favorites />);
    await screen.findAllByText("Cedar Cuts");

    const emoji = [...container.textContent].filter((ch) => ch.codePointAt(0) > 0x2100);
    expect(emoji).toEqual([]);
  });
});

describe("notification history", () => {
  beforeEach(() => {
    served.notifications = [
      {
        Id: "n-1",
        Title: "Your turn is close",
        Message: "You are next in line.",
        IsRead: false,
        CreatedAt: "2026-09-01T10:00:00.000Z",
        Data: null
      },
      {
        Id: "n-2",
        Title: "Booking confirmed",
        Message: "Saturday at 3pm.",
        IsRead: true,
        CreatedAt: "2026-08-20T10:00:00.000Z",
        Data: null
      }
    ];
  });

  it("makes each row a real button, not a clickable div", async () => {
    renderScreen(<NotificationHistory />);

    /* Rows were <div onClick>, so the whole history was keyboard-unreachable
       and announced as nothing in particular. */
    expect(await screen.findByRole("button", { name: /Your turn is close/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Booking confirmed/ })).toBeInTheDocument();
  });

  it("says which are unread without relying on the colour of a dot", async () => {
    renderScreen(<NotificationHistory />);

    const unread = await screen.findByRole("button", { name: /Your turn is close/ });
    expect(unread).toHaveAccessibleName(expect.stringContaining("Unread"));
  });

  it("offers mark-all only while something is unread", async () => {
    renderScreen(<NotificationHistory />);

    await userEvent.click(await screen.findByRole("button", { name: "Mark all read" }));
    expect(calls.patch).toContainEqual({ url: "/notifications/all/read" });
  });

  it("hides mark-all when everything has been read", async () => {
    served.notifications = served.notifications.map((n) => ({ ...n, IsRead: true }));
    renderScreen(<NotificationHistory />);

    await screen.findByRole("button", { name: /Booking confirmed/ });
    expect(screen.queryByRole("button", { name: "Mark all read" })).not.toBeInTheDocument();
  });
});
