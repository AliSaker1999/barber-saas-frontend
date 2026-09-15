import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../i18n";

import barbersReducer from "../../features/barbers/barbersSlice";
import scheduleRequestsReducer from "../../features/scheduleRequests/scheduleRequestsSlice";

/*
 * A barber's own profile.
 *
 * The screen carried a "No-Shows" tile reading Barbers.NoShowCount, a column
 * nothing in the codebase writes — the no-show increment hits the customer's
 * row on Users. It could only ever say 0. It also put an emoji where a barber
 * looks at their own face, and fired the availability switches at the server
 * with nothing rendering a failure.
 */

const served = { profile: null, barbers: [], requests: [] };
const calls = { patch: [], post: [] };

vi.mock("../../services/api", () => ({
  default: {
    get: vi.fn((url) => {
      if (url.includes("/profile")) return Promise.resolve({ data: { data: served.profile } });
      if (url === "/schedule-requests/mine")
        return Promise.resolve({ data: { data: served.requests } });
      if (url.startsWith("/barbers")) return Promise.resolve({ data: { data: served.barbers } });
      return Promise.resolve({ data: { data: [] } });
    }),
    patch: vi.fn((url, body) => {
      calls.patch.push({ url, body });
      return Promise.resolve({ data: { data: {} } });
    }),
    post: vi.fn((url, body) => {
      calls.post.push({ url, body });
      return Promise.resolve({ data: { data: {} } });
    }),
    delete: vi.fn(() => Promise.resolve({ data: {} }))
  }
}));

vi.mock("react-hot-toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() }
}));

import BarberMyProfile from "./BarberMyProfile";
import { toast } from "react-hot-toast";

const ME = "b-1";

const barberProfile = (overrides = {}) => ({
  Id: ME,
  FullName: "Karim Haddad",
  DisplayName: "Karim",
  Gender: "Male",
  Bio: "",
  YearsOfExperience: 6,
  ProfileImage: "",
  CoverImage: "",
  AverageRating: "4.50",
  ReviewsCount: 12,
  NoShowCount: 0,
  IsAvailable: true,
  IsAcceptingAppointments: true,
  AutoAcceptAppointments: true,
  ...overrides
});

function renderScreen() {
  const store = configureStore({
    reducer: {
      barbers: barbersReducer,
      scheduleRequests: scheduleRequestsReducer,
      auth: (state = { user: { id: "u-1", roles: ["BARBER"], tenantId: "t-1" } }) => state
    }
  });

  return render(
    <Provider store={store}>
      <I18nProvider>
        <MemoryRouter>
          <BarberMyProfile />
        </MemoryRouter>
      </I18nProvider>
    </Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  calls.patch = [];
  calls.post = [];
  served.profile = barberProfile();
  served.barbers = [
    { Id: ME, FullName: "Karim Haddad" },
    { Id: "b-2", FullName: "Rami Nasr" }
  ];
  served.requests = [];
});

describe("statistics that are actually computed", () => {
  it("does not show a no-show count, because nothing writes that column", async () => {
    renderScreen();

    /* Barbers.NoShowCount has no write path: no UPDATE, no trigger, seeded 0.
       A tile that can only say zero is worse than no tile. */
    expect(await screen.findByText("Karim")).toBeInTheDocument();
    expect(screen.queryByText(/no-show/i)).not.toBeInTheDocument();
  });

  it("shows the rating the reviews actually produced", async () => {
    renderScreen();

    expect(await screen.findByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("(12)")).toBeInTheDocument();
  });

  it("renders no emoji anywhere", async () => {
    const { container } = renderScreen();
    await screen.findByText("Karim");

    /* The empty avatar used to be an emoji, which the spec bans from shipping
       UI — and it sat in the one place a barber looks at their own face. */
    const emoji = [...container.textContent].filter((ch) => ch.codePointAt(0) > 0x2100);
    expect(emoji).toEqual([]);
  });
});

describe("availability switches", () => {
  it("tells the barber when the server refused the change", async () => {
    const api = (await import("../../services/api")).default;
    api.patch.mockImplementationOnce(() =>
      Promise.reject({ response: { data: { message: "Your shop has paused walk-ins." } } })
    );

    renderScreen();
    await userEvent.click(await screen.findByRole("switch", { name: /walk-ins/i }));

    /* This dispatch previously had no catch at all, so a rejected change left
       the switch where it was with nothing said. */
    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Your shop has paused walk-ins.")
    );
  });

  it("cannot auto-accept appointments it is not taking", async () => {
    served.profile = barberProfile({ IsAcceptingAppointments: false });
    renderScreen();

    const autoAccept = await screen.findByRole("switch", { name: /Accept bookings automatically/i });
    expect(autoAccept).toBeDisabled();
  });
});

describe("time off and swaps", () => {
  it("refuses an end date before the start date", async () => {
    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: "Time off" }));
    const sheet = await screen.findByRole("dialog");
    await userEvent.type(within(sheet).getByLabelText("From"), "2026-10-10");
    await userEvent.type(within(sheet).getByLabelText("To"), "2026-10-01");
    await userEvent.click(within(sheet).getByRole("button", { name: "Send request" }));

    expect(
      await screen.findByText("The end date has to be on or after the start date.")
    ).toBeInTheDocument();
    expect(calls.post).toHaveLength(0);
  });

  it("spells out the days before a barber agrees to cover them", async () => {
    served.requests = [
      {
        Id: "r-1",
        RequestType: "SWAP",
        Status: "PENDING_PARTNER",
        RequestingBarberId: "b-2",
        RequestingBarberName: "Rami Nasr",
        PartnerBarberId: ME,
        StartDate: "2026-10-05T00:00:00.000Z",
        EndDate: "2026-10-06T00:00:00.000Z",
        PartnerStartDate: "2026-10-12T00:00:00.000Z",
        PartnerEndDate: "2026-10-13T00:00:00.000Z",
        Reason: null
      }
    ];
    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: "Accept" }));

    /* Accepting is a commitment to work someone else's days, so the dates are
       in the confirmation rather than behind a bare Accept button. */
    expect(await screen.findByText(/You are agreeing to work/)).toBeInTheDocument();
    expect(calls.post).toHaveLength(0);
  });

  it("confirms before withdrawing a request the shop may be about to approve", async () => {
    served.requests = [
      {
        Id: "r-2",
        RequestType: "TIME_OFF",
        Status: "PENDING",
        RequestingBarberId: ME,
        StartDate: "2026-10-05T00:00:00.000Z",
        EndDate: "2026-10-06T00:00:00.000Z",
        Reason: null
      }
    ];
    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: "Withdraw" }));

    expect(await screen.findByText("Withdraw this request?")).toBeInTheDocument();
  });
});

describe("saving the profile", () => {
  it("will not save an empty display name, which is what customers see", async () => {
    renderScreen();

    const name = await screen.findByLabelText(/Display name/);
    await userEvent.clear(name);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Add a display name — this is what customers see.")
    ).toBeInTheDocument();
    expect(calls.patch).toHaveLength(0);
  });

  it("sends years of experience as a number, not the string from the input", async () => {
    renderScreen();

    const years = await screen.findByLabelText(/Years of experience/);
    await userEvent.clear(years);
    await userEvent.type(years, "9");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => expect(calls.patch).toHaveLength(1));
    expect(calls.patch[0].body.yearsOfExperience).toBe(9);
  });
});
