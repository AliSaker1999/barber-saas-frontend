import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "../../i18n";

import authReducer from "../../features/auth/authSlice";

/*
 * The front door.
 *
 * Every test here pins something the old screens got wrong. Login printed a
 * real personal email under a "Demo:" heading, offered a "Remember me" box
 * wired to nothing, and finished a password reset with a native alert().
 * Signup navigated away 1.5 seconds after a successful registration while
 * leaving the form live and silent, carrying a success message that the login
 * screen never read.
 */

const calls = { post: [] };

vi.mock("../../services/api", () => ({
  default: { post: vi.fn(), get: vi.fn() }
}));

/* Recording every call, whatever a test overrides the response to be.
   vi.clearAllMocks() clears calls but keeps implementations, so the default has
   to be reinstated per test or one test's stub leaks into the next. */
function defaultPost(url, body) {
  calls.post.push({ url, body });
  if (url === "/auth/login") {
    return Promise.resolve({
      data: { data: { token: "t", user: { id: "u-1", roles: ["CUSTOMER"] } } }
    });
  }
  if (url.includes("forgot-password/initiate")) {
    return Promise.resolve({ data: { data: { status: "CODE_SENT", method: "whatsapp" } } });
  }
  return Promise.resolve({ data: { data: {} } });
}

vi.mock("../../services/socket", () => ({
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn()
}));

vi.mock("react-hot-toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() }
}));

import Login from "./Login";
import Signup from "./Signup";
import { toast } from "react-hot-toast";

function renderAt(initialEntries, element) {
  const store = configureStore({ reducer: { auth: authReducer } });

  return render(
    <Provider store={store}>
      <I18nProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/login" element={element === "login" ? <Login /> : <div>login page</div>} />
            <Route path="/signup" element={element === "signup" ? <Signup /> : <div>signup page</div>} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </Provider>
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  calls.post = [];
  localStorage.clear();
  const api = (await import("../../services/api")).default;
  api.post.mockImplementation(defaultPost);
  api.get.mockImplementation(() => Promise.resolve({ data: { data: [] } }));
});

describe("what the login screen no longer shows", () => {
  it("does not print anyone's email address as a demo hint", async () => {
    renderAt(["/login"], "login");
    await screen.findByLabelText("Email");

    /* A production login page carried a real personal address under "Demo:". */
    expect(screen.queryByText(/Demo:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/@hotmail\.com|@gmail\.com/i)).not.toBeInTheDocument();
  });

  it("does not offer a Remember me box that was wired to nothing", async () => {
    renderAt(["/login"], "login");
    await screen.findByLabelText("Email");

    expect(screen.queryByLabelText(/remember me/i)).not.toBeInTheDocument();
  });
});

describe("signing in", () => {
  it("sends the credentials and lets a password manager fill the fields", async () => {
    renderAt(["/login"], "login");

    const email = await screen.findByLabelText("Email");
    const password = screen.getByLabelText("Password");

    expect(email).toHaveAttribute("autocomplete", "email");
    expect(password).toHaveAttribute("autocomplete", "current-password");

    await userEvent.type(email, "rami@example.com");
    await userEvent.type(password, "hunter2hunter2");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await vi.waitFor(() => expect(calls.post).toHaveLength(1));
    expect(calls.post[0].url).toBe("/auth/login");
    expect(calls.post[0].body).toEqual({
      email: "rami@example.com",
      password: "hunter2hunter2"
    });
  });

  it("reveals the password on request, in words rather than a glyph", async () => {
    renderAt(["/login"], "login");

    const password = await screen.findByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");

    await userEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide" })).toBeInTheDocument();
  });

  it("shows the message signup sends it, which used to go nowhere", async () => {
    renderAt(
      [{ pathname: "/login", state: { message: "Account created. Sign in to get started." } }],
      "login"
    );
    await screen.findByLabelText("Email");

    /* Signup has always passed this through router state and login never read
       it, so a new account landed here with no acknowledgement at all. */
    await vi.waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Account created. Sign in to get started.")
    );
  });
});

describe("resetting a forgotten password", () => {
  it("walks the steps and never opens a native alert", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    renderAt(["/login"], "login");
    await userEvent.click(await screen.findByRole("button", { name: "Forgot password?" }));

    const sheet = await screen.findByRole("dialog");
    await userEvent.type(within(sheet).getByLabelText("Email or phone number"), "rami@example.com");
    await userEvent.click(within(sheet).getByRole("button", { name: "Continue" }));

    /* Code step. */
    await screen.findByText(/6-digit code to your WhatsApp/);
    await userEvent.type(screen.getByLabelText("6-digit code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    /* New password step. */
    await userEvent.type(await screen.findByLabelText("New password"), "brandnewpass1");
    await userEvent.click(screen.getByRole("button", { name: "Set new password" }));

    await vi.waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Password changed. You can sign in now.")
    );
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("refuses a half-typed code instead of asking for a password first", async () => {
    const api = (await import("../../services/api")).default;
    api.post.mockImplementation((url, body) => {
      calls.post.push({ url, body });
      return Promise.resolve({ data: { data: { status: "CODE_SENT", method: "email" } } });
    });

    renderAt(["/login"], "login");
    await userEvent.click(await screen.findByRole("button", { name: "Forgot password?" }));

    const sheet = await screen.findByRole("dialog");
    await userEvent.type(within(sheet).getByLabelText("Email or phone number"), "rami@example.com");
    await userEvent.click(within(sheet).getByRole("button", { name: "Continue" }));

    /* Wait for the sheet to actually be on the code step before touching it —
       clicking Continue while it is still swapping is what made this flaky. */
    await screen.findByText(/6-digit code to your email/);
    await userEvent.type(await screen.findByLabelText("6-digit code"), "12");
    await userEvent.click(within(sheet).getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Enter all six digits.")).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  });
});

describe("creating an account", () => {
  async function fillSignup() {
    await userEvent.type(await screen.findByLabelText("Full name"), "Rami Nasr");
    await userEvent.type(screen.getByLabelText("Email"), "rami@example.com");
    await userEvent.type(screen.getByLabelText("Phone number"), "03123456");
    await userEvent.type(screen.getByLabelText("Date of birth"), "1995-04-12");

    await userEvent.click(screen.getByRole("combobox", { name: "Gender" }));
    await userEvent.click(await screen.findByRole("option", { name: "Man" }));

    await userEvent.type(screen.getByLabelText("Password"), "hunter2hunter2");
    await userEvent.type(screen.getByLabelText("Confirm password"), "hunter2hunter2");
  }

  it("will not let you agree to documents you have not opened", async () => {
    renderAt(["/signup"], "signup");
    await screen.findByLabelText("Full name");

    const consent = screen.getByRole("checkbox");
    expect(consent).toBeDisabled();

    await userEvent.click(screen.getAllByRole("button", { name: "Terms of Service" })[0]);
    expect(consent).toBeDisabled();

    await userEvent.click(screen.getAllByRole("button", { name: "Privacy Policy" })[0]);
    expect(consent).toBeEnabled();
  });

  it("registers once and leaves immediately, with no window for a second tap", async () => {
    renderAt(["/signup"], "signup");
    await fillSignup();

    await userEvent.click(screen.getAllByRole("button", { name: "Terms of Service" })[0]);
    await userEvent.click(screen.getAllByRole("button", { name: "Privacy Policy" })[0]);
    await userEvent.click(screen.getByRole("checkbox"));

    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    /* The old version cleared its loading flag immediately and navigated 1.5s
       later, leaving the button live and silent in between. */
    await vi.waitFor(() => expect(screen.getByText("login page")).toBeInTheDocument());
    expect(calls.post.filter((c) => c.url === "/auth/register/customer")).toHaveLength(1);
  });

  it("says which field is wrong rather than failing at the server", async () => {
    renderAt(["/signup"], "signup");
    await screen.findByLabelText("Full name");

    await userEvent.type(screen.getByLabelText("Full name"), "Rami");
    await userEvent.type(screen.getByLabelText("Email"), "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText("That email address does not look right.")
    ).toBeInTheDocument();
    expect(calls.post).toHaveLength(0);
  });
});
