import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../i18n";
import RegisterShop from "./RegisterShop";

/*
 * The in-app half of "become a shop" — previously a single WhatsApp link
 * asking an owner to message support. This creates the tenant and owner
 * account right away, but the tenant lands inactive with no plan, so the
 * form's own job is to be honest that submitting is not the same as being
 * live yet.
 */

const calls = { post: [] };

vi.mock("../../services/api", () => ({
  default: {
    post: vi.fn((url, body) => {
      calls.post.push({ url, body });
      return Promise.resolve({ data: { data: { status: "PENDING_REVIEW" } } });
    })
  }
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <RegisterShop />
      </I18nProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  calls.post = [];
});

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText("Shop name"), "Cedar Cuts");
  await userEvent.type(screen.getByLabelText("Your name"), "Rami Nasr");
  await userEvent.type(screen.getByLabelText("Email"), "rami@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "SecurePass123");
}

describe("RegisterShop", () => {
  it("submits to /shop-signup and shows a pending-review confirmation, not a login redirect", async () => {
    renderPage();
    await fillValidForm();
    await userEvent.click(screen.getByRole("button", { name: "Submit for review" }));

    expect(await screen.findByText("Thanks — we've got it")).toBeInTheDocument();
    expect(calls.post).toHaveLength(1);
    expect(calls.post[0].url).toBe("/shop-signup");
    expect(calls.post[0].body).toMatchObject({
      shopName: "Cedar Cuts",
      ownerName: "Rami Nasr",
      email: "rami@example.com"
    });
  });

  it("refuses a password under 6 characters before calling the API", async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText("Shop name"), "Cedar Cuts");
    await userEvent.type(screen.getByLabelText("Your name"), "Rami Nasr");
    await userEvent.type(screen.getByLabelText("Email"), "rami@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "abc");
    await userEvent.click(screen.getByRole("button", { name: "Submit for review" }));

    expect(
      await screen.findByText("Password must be at least 6 characters.")
    ).toBeInTheDocument();
    expect(calls.post).toHaveLength(0);
  });

  it("surfaces a server error (e.g. email already registered) instead of failing silently", async () => {
    const api = (await import("../../services/api")).default;
    api.post.mockRejectedValueOnce({
      response: { data: { message: "An account with this email already exists. Try logging in instead." } }
    });

    renderPage();
    await fillValidForm();
    await userEvent.click(screen.getByRole("button", { name: "Submit for review" }));

    expect(
      await screen.findByText("An account with this email already exists. Try logging in instead.")
    ).toBeInTheDocument();
  });
});
