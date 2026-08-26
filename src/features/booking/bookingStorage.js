const KEY = "booking_state";

// `key` defaults to the authenticated booking flow's key; the public/guest flow
// passes its own key so the two never read or clobber each other's draft state
// when both happen to be used in the same browser.
export function loadBookingState(key = KEY) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function saveBookingState(state, key = KEY) {
  try {
    const data = {
      tenantId: state.tenantId,
      selectedServiceIds: state.selectedServiceIds,
      selectedBarberId: state.selectedBarberId
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* empty */ }
}

export function clearBookingState(key = KEY) {
  localStorage.removeItem(key);
}
