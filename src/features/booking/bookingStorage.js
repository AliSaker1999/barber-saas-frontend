const KEY = "booking_state";

export function loadBookingState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function saveBookingState(state) {
  try {
    const data = {
      tenantId: state.tenantId,
      selectedServiceIds: state.selectedServiceIds,
      selectedBarberId: state.selectedBarberId
    };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch { /* empty */ }
}

export function clearBookingState() {
  localStorage.removeItem(KEY);
}
