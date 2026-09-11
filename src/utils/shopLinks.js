/*
 * Address and map links for a shop.
 *
 * Shared by the in-app shop profile, the public QR landing page and the
 * booking confirmation, so all three send a customer to the same place. Kept
 * out of the component files because those may only export components.
 */

/* "Rue Gouraud, Building 12, Mar Mikhael, Beirut" — whatever the shop filled in. */
export function shopAddress(shop) {
  if (!shop) return null;
  const parts = [shop.Street, shop.Building, shop.Area, shop.City].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/*
 * Best available "get directions" target, in descending order of precision:
 * the shop's own map link, then its coordinates, then a name + address search.
 * Returns null rather than a useless empty search when we have nothing.
 */
export function shopMapsHref(shop) {
  if (!shop) return null;

  if (shop.GoogleMapLink) return shop.GoogleMapLink;

  if (shop.Latitude != null && shop.Longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${shop.Latitude},${shop.Longitude}`;
  }

  const address = shopAddress(shop);
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${shop.Name || ""} ${address}`.trim()
    )}`;
  }

  return null;
}

/*
 * The shop's public booking URL — the one printed on QR cards and pasted into
 * Instagram bios.
 *
 * VITE_PUBLIC_WEB_URL matters here: inside the Capacitor Android build
 * `window.location.origin` is the app shell's own origin, which is not a URL
 * anybody can open. Falling back to the origin keeps the web build working in
 * development.
 */
export function publicBookingUrl(slug, source) {
  if (!slug) return null;

  const configured = (import.meta.env.VITE_PUBLIC_WEB_URL || "").replace(/\/$/, "");
  const origin = configured || window.location.origin;
  const query = source ? `?src=${encodeURIComponent(source)}` : "";

  return `${origin}/book/${slug}${query}`;
}
