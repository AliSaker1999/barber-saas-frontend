import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "../../i18n";

/*
 * The portfolio editor that never existed.
 *
 * POST/PATCH/DELETE /barbers/:barberId/gallery has been complete since the
 * feature was built, and ShopGallery already renders the result on the shop
 * page and on the public booking link. Nothing could put a photo in.
 */

const served = { images: [] };
const calls = { post: [], delete: [] };
const fail = { post: false, get: false, delete: false };

vi.mock("../../services/api", () => ({
  default: {
    get: vi.fn(() =>
      fail.get
        ? Promise.reject({ response: { data: { message: "Gallery is unavailable." } } })
        : Promise.resolve({ data: { data: served.images } })
    ),
    post: vi.fn((url, body) => {
      calls.post.push({ url, body });
      if (fail.post) {
        return Promise.reject({ response: { data: { message: "That file was too large." } } });
      }
      return Promise.resolve({
        data: { data: { Id: "g-new", ImageUrl: body.imageUrl, Caption: body.caption || null } }
      });
    }),
    delete: vi.fn((url) => {
      calls.delete.push({ url });
      if (fail.delete) {
        return Promise.reject({ response: { data: { message: "Could not remove it." } } });
      }
      return Promise.resolve({ data: { data: {} } });
    })
  }
}));

vi.mock("../../services/media", () => ({
  uploadImage: vi.fn(() => Promise.resolve({ url: "https://cdn.test/fade.jpg" }))
}));

vi.mock("react-hot-toast", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import GalleryEditor from "./GalleryEditor";
import { toast } from "react-hot-toast";

function renderEditor() {
  return render(
    <I18nProvider>
      <GalleryEditor barberId="b-1" barberName="Karim" />
    </I18nProvider>
  );
}

const file = () => new File(["x"], "fade.jpg", { type: "image/jpeg" });

beforeEach(() => {
  vi.clearAllMocks();
  calls.post = [];
  calls.delete = [];
  fail.post = false;
  fail.get = false;
  fail.delete = false;
  served.images = [];
});

describe("putting a photo on the shop page", () => {
  it("uploads, asks for a caption, then attaches it", async () => {
    renderEditor();

    await screen.findByText("No photos yet");
    await userEvent.upload(screen.getByLabelText(/Add a photo/), file());

    /* The caption step is inline, not a second sheet — this editor is also
       rendered inside the owner's per-barber sheet. */
    const caption = await screen.findByLabelText(/Caption/);
    await userEvent.type(caption, "Skin fade");
    await userEvent.click(screen.getByRole("button", { name: "Add to your work" }));

    await vi.waitFor(() => expect(calls.post).toHaveLength(1));
    expect(calls.post[0].url).toBe("/barbers/b-1/gallery");
    expect(calls.post[0].body).toEqual({
      imageUrl: "https://cdn.test/fade.jpg",
      caption: "Skin fade"
    });
  });

  it("allows a photo with no caption at all", async () => {
    renderEditor();

    await screen.findByText("No photos yet");
    await userEvent.upload(screen.getByLabelText(/Add a photo/), file());
    await screen.findByLabelText(/Caption/);
    await userEvent.click(screen.getByRole("button", { name: "Add to your work" }));

    await vi.waitFor(() => expect(calls.post).toHaveLength(1));
    expect(calls.post[0].body.caption).toBeUndefined();
  });

  it("says why an upload was refused rather than dropping it", async () => {
    fail.post = true;
    renderEditor();

    await screen.findByText("No photos yet");
    await userEvent.upload(screen.getByLabelText(/Add a photo/), file());
    await screen.findByLabelText(/Caption/);
    await userEvent.click(screen.getByRole("button", { name: "Add to your work" }));

    expect(await screen.findByText("That file was too large.")).toBeInTheDocument();
    /* The pending photo stays on screen so it can be retried. */
    expect(screen.getByLabelText(/Caption/)).toBeInTheDocument();
  });
});

describe("removing a photo", () => {
  beforeEach(() => {
    served.images = [
      { Id: "g-1", ImageUrl: "https://cdn.test/one.jpg", Caption: "Skin fade" }
    ];
  });

  it("confirms first, and says the photo is not recoverable", async () => {
    renderEditor();

    await userEvent.click(await screen.findByRole("button", { name: /Remove photo/ }));

    expect(await screen.findByText("Remove this photo?")).toBeInTheDocument();
    expect(screen.getByText(/You would have to upload it again/)).toBeInTheDocument();
    expect(calls.delete).toHaveLength(0);
  });

  it("removes it once confirmed", async () => {
    renderEditor();

    await userEvent.click(await screen.findByRole("button", { name: /Remove photo/ }));
    const sheet = await screen.findByRole("dialog");
    await userEvent.click(within(sheet).getByRole("button", { name: "Delete" }));

    await vi.waitFor(() => expect(calls.delete).toHaveLength(1));
    expect(calls.delete[0].url).toBe("/barbers/b-1/gallery/g-1");
  });

  it("surfaces a refused delete", async () => {
    fail.delete = true;
    renderEditor();

    await userEvent.click(await screen.findByRole("button", { name: /Remove photo/ }));
    const sheet = await screen.findByRole("dialog");
    await userEvent.click(within(sheet).getByRole("button", { name: "Delete" }));

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Could not remove it.")
    );
  });
});

describe("when the gallery cannot be read", () => {
  it("says so instead of claiming there are no photos", async () => {
    fail.get = true;
    renderEditor();

    expect(await screen.findByText("Gallery is unavailable.")).toBeInTheDocument();
  });
});
