import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../i18n";

import Icon, { ICON_NAMES } from "./Icon";
import Button, { IconButton } from "./Button";
import ShopCard from "./ShopCard";
import ServiceCard from "./ServiceCard";
import BarberCard from "./BarberCard";
import BottomSheet, { ConfirmSheet } from "./BottomSheet";
import BottomNavigation from "./BottomNavigation";
import { QueueStatusHero, QueueProgress } from "./QueueStatusCard";
import BookingSummary from "./BookingSummary";
import { EmptyState, ErrorState, OfflineBanner } from "./States";

/*
 * Smoke tests for the design system.
 *
 * A green build only proves these files parse. These prove they render, that
 * the accessible names are there, and — for the shop card and queue status,
 * where a wrong number is a broken promise to the customer — that the right
 * information reaches the screen.
 */

const wrap = (ui) =>
  render(
    <MemoryRouter>
      <I18nProvider>{ui}</I18nProvider>
    </MemoryRouter>
  );

const shop = (overrides = {}) => ({
  Id: "shop-1",
  Name: "Hamra Barber",
  Area: "Hamra",
  Currency: "USD",
  MinPrice: 15,
  MaxPrice: 30,
  AverageRating: 4.6,
  ReviewsCount: 82,
  IsOpenNow: true,
  IsVerified: true,
  WalkInAvailable: true,
  MinWaitMinutes: 20,
  BarbersOnDutyNow: 2,
  ...overrides
});

describe("Icon", () => {
  it("renders every named glyph without warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    ICON_NAMES.forEach((name) => {
      const { container, unmount } = render(<Icon name={name} />);
      expect(container.querySelector("path")).toBeTruthy();
      unmount();
    });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("hides decorative icons from assistive tech", () => {
    const { container } = render(<Icon name="home" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("exposes an icon that carries meaning", () => {
    render(<Icon name="verified" title="Verified" />);
    expect(screen.getByRole("img", { name: "Verified" })).toBeInTheDocument();
  });
});

describe("Button", () => {
  it("fires onClick", async () => {
    const onClick = vi.fn();
    wrap(<Button onClick={onClick}>Book now</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Book now" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("blocks repeat taps while loading", async () => {
    const onClick = vi.fn();
    wrap(
      <Button loading onClick={onClick}>
        Confirm booking
      </Button>
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("renders a link when given a route", () => {
    wrap(<Button to="/customer/explore">Find a barber</Button>);
    expect(screen.getByRole("link", { name: "Find a barber" })).toHaveAttribute(
      "href",
      "/customer/explore"
    );
  });

  it("gives an icon-only control an accessible name", () => {
    wrap(<IconButton icon="bell" label="Notifications" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });
});

describe("ShopCard", () => {
  it("leads with the walk-in wait, not just 'open'", () => {
    wrap(<ShopCard shop={shop()} />);
    expect(screen.getByText("Hamra Barber")).toBeInTheDocument();
    expect(screen.getByText(/\d+–\d+ min/)).toBeInTheDocument();
    expect(screen.getByText("2 barbers in")).toBeInTheDocument();
  });

  it("shows the price band and rating", () => {
    wrap(<ShopCard shop={shop()} />);
    expect(screen.getByText("$15–$30")).toBeInTheDocument();
    expect(screen.getByText("4.6")).toBeInTheDocument();
  });

  it("marks an unrated shop as new instead of zero stars", () => {
    wrap(<ShopCard shop={shop({ AverageRating: null, ReviewsCount: 0 })} />);
    expect(screen.getByText("New shop")).toBeInTheDocument();
  });

  it("links to the shop profile", () => {
    wrap(<ShopCard shop={shop()} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/customer/shop/shop-1");
  });

  it("says when a closed shop reopens", () => {
    wrap(
      <ShopCard
        shop={shop({ IsOpenNow: false, WalkInAvailable: false, OpensAt: "09:00:00" })}
      />
    );
    expect(screen.getByText("Opens 09:00")).toBeInTheDocument();
  });
});

describe("ServiceCard", () => {
  it("always shows duration and price together", () => {
    wrap(
      <ServiceCard service={{ Id: "s1", Name: "Fade", DurationMinutes: 45, Price: 20 }} />
    );
    expect(screen.getByText("Fade")).toBeInTheDocument();
    expect(screen.getByText("45 min")).toBeInTheDocument();
    expect(screen.getByText("$20")).toBeInTheDocument();
  });

  it("prices in the shop's own currency without converting", () => {
    wrap(
      <ServiceCard
        currency="LBP"
        service={{ Id: "s1", Name: "Fade", DurationMinutes: 45, Price: 1800000 }}
      />
    );
    expect(screen.getByText("1,800,000 L.L.")).toBeInTheDocument();
  });

  it("reports its selected state when selectable", async () => {
    const onSelect = vi.fn();
    wrap(
      <ServiceCard
        selectable
        selected
        onSelect={onSelect}
        service={{ Id: "s1", Name: "Fade", DurationMinutes: 45, Price: 20 }}
      />
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledOnce();
  });
});

describe("BarberCard", () => {
  it("offers 'first available' as its own choice", () => {
    wrap(<BarberCard barber={{ isFirstAvailable: true }} variant="selectable" />);
    expect(screen.getByText("First available")).toBeInTheDocument();
    expect(screen.getByText("Soonest time")).toBeInTheDocument();
  });

  it("says a barber is not in today rather than hiding them", () => {
    wrap(
      <BarberCard
        variant="selectable"
        barber={{ barberId: "b1", fullName: "Rami", isAvailable: false }}
      />
    );
    expect(screen.getByText("Rami")).toBeInTheDocument();
    expect(screen.getByText("Not in today")).toBeInTheDocument();
  });
});

describe("QueueStatus", () => {
  it("shows the position and an estimated range", () => {
    wrap(<QueueStatusHero queue={{ statusId: 1, position: 3, waitTime: 26 }} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/\d+–\d+ min/)).toBeInTheDocument();
    expect(screen.getByText("Updates live")).toBeInTheDocument();
  });

  it("says so when the live connection has dropped", () => {
    wrap(<QueueStatusHero queue={{ statusId: 1, position: 3, waitTime: 26 }} stale />);
    expect(screen.getByText("Not live — reconnecting")).toBeInTheDocument();
    expect(screen.queryByText("Updates live")).not.toBeInTheDocument();
  });

  it("renders the four-step progress line", () => {
    wrap(<QueueProgress queue={{ statusId: 1, position: 2 }} />);
    expect(screen.getByText("Joined")).toBeInTheDocument();
    expect(screen.getByText("Your cut")).toBeInTheDocument();
  });
});

describe("BookingSummary", () => {
  it("shows the policies before the customer commits", () => {
    wrap(
      <BookingSummary
        shopName="Hamra Barber"
        barberName="Rami"
        services={[{ name: "Fade" }]}
        startTime="2026-03-08T18:30:00"
        currency="USD"
        totalPrice={20}
        totalDuration={45}
        depositAmount={5}
        cancellationHours={24}
      />
    );

    expect(screen.getByText("Fade")).toBeInTheDocument();
    expect(screen.getByText("$20")).toBeInTheDocument();
    expect(screen.getByText(/deposit is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Free cancellation up to 24/)).toBeInTheDocument();
  });

  it("subtracts a discount from the total shown", () => {
    wrap(
      <BookingSummary
        services={[{ name: "Fade" }]}
        currency="USD"
        totalPrice={30}
        discount={10}
      />
    );
    expect(screen.getByText("$20")).toBeInTheDocument();
  });
});

describe("BottomSheet", () => {
  it("renders nothing when closed", () => {
    wrap(
      <BottomSheet open={false} onClose={() => {}} title="Sort by">
        <p>Body</p>
      </BottomSheet>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("exposes itself as a modal dialog", () => {
    wrap(
      <BottomSheet open onClose={() => {}} title="Sort by">
        <p>Body</p>
      </BottomSheet>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    wrap(
      <BottomSheet open onClose={onClose} title="Sort by">
        <p>Body</p>
      </BottomSheet>
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("does not dismiss on Escape when marked non-dismissible", async () => {
    const onClose = vi.fn();
    wrap(
      <BottomSheet open dismissible={false} onClose={onClose} title="Working">
        <p>Body</p>
      </BottomSheet>
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("ConfirmSheet", () => {
  it("gates a destructive action behind an explicit confirm", async () => {
    const onConfirm = vi.fn();
    wrap(
      <ConfirmSheet
        open
        onClose={() => {}}
        onConfirm={onConfirm}
        title="Leave the queue?"
        message="You'll lose your place."
        confirmLabel="Leave queue"
      />
    );

    expect(screen.getByText("Leave the queue?")).toBeInTheDocument();
    expect(screen.getByText("You'll lose your place.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Leave queue" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});

describe("BottomNavigation", () => {
  const items = [
    { to: "/customer", icon: "home", label: "Home", end: true },
    { to: "/customer/explore", icon: "search", label: "Explore" },
    { to: "/customer/bookings", icon: "calendar", label: "Bookings" },
    { to: "/customer/queue", icon: "clock", label: "Queue", badge: 1 },
    { to: "/customer/profile", icon: "user", label: "Profile" }
  ];

  it("shows exactly five destinations, each with a text label", () => {
    wrap(<BottomNavigation items={items} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(5);
    ["Home", "Explore", "Bookings", "Queue", "Profile"].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("supports a tab that opens a sheet instead of navigating", async () => {
    const onClick = vi.fn();
    wrap(
      <BottomNavigation
        items={[...items.slice(0, 4), { to: "#more", icon: "more", label: "More", onClick }]}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /More/ }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("states", () => {
  it("an empty state offers the next action", async () => {
    wrap(
      <EmptyState
        icon="calendar"
        title="No upcoming bookings"
        description="Find a barber and book your next cut."
        actionLabel="Find a barber"
        actionTo="/customer/explore"
      />
    );
    expect(screen.getByText("No upcoming bookings")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Find a barber" })).toBeInTheDocument();
  });

  it("an error state offers a retry and announces itself", async () => {
    const onRetry = vi.fn();
    wrap(<ErrorState onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("the offline banner names when the cached data was saved", () => {
    wrap(<OfflineBanner lastSyncLabel="18:04" />);
    expect(screen.getByText("You're offline")).toBeInTheDocument();
    expect(screen.getByText(/18:04/)).toBeInTheDocument();
  });
});
