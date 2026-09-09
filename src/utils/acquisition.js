/*
 * Acquisition attribution.
 *
 * A shop's shared booking links carry `?src=qr`, `?src=instagram` and so on
 * (generated on the Share & QR screen). The tag has to survive the whole
 * guest-booking flow — landing → service → barber → time → phone → account —
 * because the account is only created at the end, which is the one moment the
 * server can record where this customer came from.
 *
 * sessionStorage, not a URL parameter carried through every navigation: the
 * customer may refresh, use the back button, or follow an internal link, and
 * the tag should still be attached to the booking they came to make. Scoped to
 * the tab, so it also expires on its own.
 */

const KEY = "ajmal_src";

/* Mirrors ACQUISITION_SOURCES on the server — anything else is discarded
   rather than stored, so the column stays reportable. */
const VALID = new Set(["qr", "instagram", "whatsapp", "referral", "poster", "search", "direct"]);

function safeSession() {
  try {
    return window.sessionStorage;
  } catch {
    /* Private mode or blocked storage — attribution is a nice-to-have, so
       losing it must never break a booking. */
    return null;
  }
}

/* Call once on a public landing page. Records the tag if the URL carries one. */
export function captureAcquisitionSource(search) {
  const store = safeSession();
  if (!store) return null;

  try {
    const params = new URLSearchParams(search || window.location.search);
    const raw = (params.get("src") || params.get("utm_source") || "").toLowerCase();

    if (VALID.has(raw)) {
      store.setItem(KEY, raw);
      return raw;
    }

    /* Don't overwrite a tag captured earlier in the session with "direct". */
    return store.getItem(KEY);
  } catch {
    return null;
  }
}

export function getAcquisitionSource() {
  const store = safeSession();
  if (!store) return null;
  try {
    const value = store.getItem(KEY);
    return VALID.has(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearAcquisitionSource() {
  const store = safeSession();
  if (!store) return;
  try {
    store.removeItem(KEY);
  } catch {
    /* Nothing to do — the value expires with the tab regardless. */
  }
}
