/*
 * Shop-supplied content in the reader's language.
 *
 * The app's own chrome is fully bilingual, but everything a shop types — its
 * name, its promotions, its service names — was rendered in whatever language
 * the owner happened to use, to every customer, in both locales. The database
 * has carried the Arabic columns since early on (Tenants.NameAr,
 * Tenants.DescriptionAr, Promotions.TitleAr, Promotions.DescriptionAr,
 * Services.NameAr) and nothing has ever displayed one.
 *
 * Falls back to the base field rather than showing an empty string: a shop that
 * has not filled in an Arabic name should read as its English name, not as a
 * blank card.
 *
 *   localized(shop, "Name", locale)        -> shop.NameAr || shop.Name
 *   localized(promo, "Title", locale)      -> promo.TitleAr || promo.Title
 */
export function localized(row, field, locale) {
  if (!row) return "";
  const base = row[field];
  if (locale !== "ar") return base;
  const arabic = row[`${field}Ar`];
  return (typeof arabic === "string" && arabic.trim()) ? arabic : base;
}
