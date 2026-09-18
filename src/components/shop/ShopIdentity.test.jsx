import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "../../i18n";
import ShopIdentity from "./ShopIdentity";

/*
 * Tenants.Description/DescriptionAr existed and nothing read or wrote them --
 * a customer never saw a shop's own "about" text at all, in either language.
 */

const shop = {
  Name: "Cedar Cuts",
  NameAr: "قصات الأرز",
  Description: "Classic cuts since 1998.",
  DescriptionAr: "قصات كلاسيكية منذ 1998.",
  Area: "Hamra"
};

const wrap = (ui) => render(<I18nProvider>{ui}</I18nProvider>);

afterEach(() => {
  localStorage.removeItem("ajmal_language");
});

describe("ShopIdentity", () => {
  it("shows the English about text by default", () => {
    wrap(<ShopIdentity shop={shop} reviews={null} />);
    expect(screen.getByText("Classic cuts since 1998.")).toBeInTheDocument();
  });

  it("shows the Arabic about text in Arabic", () => {
    localStorage.setItem("ajmal_language", "ar");
    wrap(<ShopIdentity shop={shop} reviews={null} />);
    expect(screen.getByText("قصات كلاسيكية منذ 1998.")).toBeInTheDocument();
  });

  it("renders nothing extra when the shop has no about text", () => {
    wrap(<ShopIdentity shop={{ ...shop, Description: "", DescriptionAr: "" }} reviews={null} />);
    expect(screen.queryByText("Classic cuts since 1998.")).not.toBeInTheDocument();
  });
});
