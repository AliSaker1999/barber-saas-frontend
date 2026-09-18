import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { I18nProvider } from "../../i18n";
import companyReducer from "../../features/company/companySlice";
import ShareBooking from "./ShareBooking";

/*
 * Every shared/printed link now points at the backend's GET /share/:slug
 * instead of the SPA's own /book/:slug directly -- that route renders a
 * shop's real name/photo for a crawler building a link preview, which the
 * client-rendered SPA can't do on its own. This only pins the URL shape;
 * share.routes.ts on the backend covers the crawler-vs-browser behavior.
 */

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,x") }
}));

function renderWithShop(shop) {
  const store = configureStore({
    reducer: { company: companyReducer },
    preloadedState: { company: { profile: shop, loading: false } }
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <I18nProvider>
          <ShareBooking />
        </I18nProvider>
      </MemoryRouter>
    </Provider>
  );
}

describe("ShareBooking link", () => {
  it("points at the backend's /share/:slug, not the SPA's /book/:slug directly", async () => {
    const { container } = renderWithShop({ Id: "t-1", Name: "Cedar Cuts", Slug: "cedar-cuts" });

    await waitFor(() => {
      expect(container.textContent).toContain("/share/cedar-cuts");
    });
    expect(container.textContent).not.toContain("/book/cedar-cuts");
  });
});
