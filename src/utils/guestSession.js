/*
 * The guest booking session.
 *
 * A guest who books or joins a queue from a shop's QR link holds a real JWT
 * (issued by POST /public/tenants/:slug/guest) but has no account to log back
 * into. That token used to live only in `publicApi.defaults.headers`, so a
 * page refresh — or the phone locking and the tab being restored — threw it
 * away and forced the customer through name, phone and OTP all over again.
 * Worse, once they were in a walk-in queue there was then no way to show them
 * their position.
 *
 * So it is persisted, with three deliberate constraints:
 *
 *   1. `sessionStorage`, not `localStorage` — the session dies with the tab
 *      rather than leaving a bearer token on a shared phone indefinitely.
 *   2. Its own key. The comment in services/publicApi.js is emphatic that the
 *      public flow must never read, write or clear the shared `token`/`user`
 *      keys, because a genuinely signed-in session on the same browser may
 *      depend on them.
 *   3. Every access is wrapped — private mode and blocked site data must
 *      degrade to "no saved session", never throw mid-booking.
 */

const KEY = "ajmal_guest_session";

function safeSession() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/*
 * `slug` is stored alongside the token so a restored session can be checked
 * against the shop actually being viewed — a guest token minted at one shop
 * should not silently act on another.
 */
export function saveGuestSession(session) {
  const store = safeSession();
  if (!store || !session?.token) return;

  try {
    /* Persisted wholesale rather than field by field, so callers that add to
       the session (saveGuestQueue) cannot silently lose what they passed. */
    store.setItem(KEY, JSON.stringify(session));
  } catch {
    /* Out of quota or blocked — the in-memory token still works for this
       page view, which is the old behaviour. */
  }
}

export function loadGuestSession() {
  const store = safeSession();
  if (!store) return null;

  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.token === "string" ? parsed : null;
  } catch {
    /* Corrupt value — treat it as absent rather than crashing the page. */
    return null;
  }
}

export function clearGuestSession() {
  const store = safeSession();
  if (!store) return;
  try {
    store.removeItem(KEY);
  } catch {
    /* Expires with the tab regardless. */
  }
}

/* Remembers which queue a guest joined, so reopening the link resumes the
   tracker instead of offering them the queue they are already in. */
export function saveGuestQueue({ tenantId, slug, queueId }) {
  const existing = loadGuestSession();
  if (!existing) return;
  saveGuestSession({ ...existing, queue: { tenantId, slug, queueId } });
}

export function getGuestQueue() {
  return loadGuestSession()?.queue || null;
}
