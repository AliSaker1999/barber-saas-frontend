/*
 * Appointment status, in one place.
 *
 * The API returns both `StatusId` and the `Status` name; screens previously
 * compared against whichever they happened to have, which is how a cancelled
 * booking ended up counted as upcoming. Everything reads through these helpers
 * now, keyed on the name with the id as a fallback.
 */

export const APPOINTMENT_STATUS = {
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
  PENDING: "PENDING",
  DECLINED: "DECLINED",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  APPROVED: "APPROVED"
};

/*
 * These are the AppointmentStatus rows, and 3 and 5 used to be the wrong way
 * round — PENDING is 3 and CANCELLED is 5, not the reverse. It was masked
 * because statusOf() prefers the Status name and the API always sends one, but
 * the whole purpose of this map is to be the fallback when it does not, and a
 * cancelled booking reading as pending is the worst way for it to be wrong.
 * The backend's core/appointments/status.ts is the other half of this pair.
 */
const ID_TO_NAME = {
  1: APPOINTMENT_STATUS.SCHEDULED,
  2: APPOINTMENT_STATUS.COMPLETED,
  3: APPOINTMENT_STATUS.PENDING,
  4: APPOINTMENT_STATUS.NO_SHOW,
  5: APPOINTMENT_STATUS.CANCELLED,
  6: APPOINTMENT_STATUS.DECLINED,
  7: APPOINTMENT_STATUS.AWAITING_PAYMENT,
  8: APPOINTMENT_STATUS.APPROVED
};

/*
 * Name to id, for the few places that write a status optimistically into the
 * store. Those used to hardcode the number, which is how the cancel case ended
 * up writing Status "CANCELLED" alongside StatusId 3 — self-consistent only
 * because ID_TO_NAME was wrong in the same direction.
 */
export const STATUS_ID = Object.freeze(
  Object.entries(ID_TO_NAME).reduce((map, [id, name]) => ({ ...map, [name]: Number(id) }), {})
);

export function statusOf(appointment) {
  if (!appointment) return null;
  return appointment.Status || ID_TO_NAME[appointment.StatusId] || null;
}

/* A booking the customer still has to turn up for. */
export function isActive(appointment) {
  const status = statusOf(appointment);
  return (
    status === APPOINTMENT_STATUS.SCHEDULED ||
    status === APPOINTMENT_STATUS.PENDING ||
    status === APPOINTMENT_STATUS.AWAITING_PAYMENT
  );
}

export function isCancelled(appointment) {
  const status = statusOf(appointment);
  return status === APPOINTMENT_STATUS.CANCELLED || status === APPOINTMENT_STATUS.DECLINED;
}

export function isCompleted(appointment) {
  return statusOf(appointment) === APPOINTMENT_STATUS.COMPLETED;
}

/* Tone for the status pill — semantic tokens, not per-screen guesses. */
export function statusTone(appointment) {
  switch (statusOf(appointment)) {
    case APPOINTMENT_STATUS.SCHEDULED:
      return "success";
    case APPOINTMENT_STATUS.PENDING:
    case APPOINTMENT_STATUS.AWAITING_PAYMENT:
      return "warning";
    case APPOINTMENT_STATUS.CANCELLED:
    case APPOINTMENT_STATUS.DECLINED:
    case APPOINTMENT_STATUS.NO_SHOW:
      return "danger";
    case APPOINTMENT_STATUS.COMPLETED:
      return "neutral";
    default:
      return "neutral";
  }
}

export function statusLabel(appointment, t) {
  const map = {
    [APPOINTMENT_STATUS.SCHEDULED]: "status_scheduled",
    [APPOINTMENT_STATUS.PENDING]: "status_pending",
    [APPOINTMENT_STATUS.COMPLETED]: "status_completed",
    [APPOINTMENT_STATUS.CANCELLED]: "status_cancelled",
    [APPOINTMENT_STATUS.DECLINED]: "status_declined",
    [APPOINTMENT_STATUS.NO_SHOW]: "status_no_show",
    [APPOINTMENT_STATUS.AWAITING_PAYMENT]: "status_awaiting_payment"
  };

  const key = map[statusOf(appointment)];
  return key ? t(key) : statusOf(appointment) || "";
}

/* Total price and duration of an appointment's services. */
export function appointmentTotals(appointment) {
  const services = appointment?.services || [];
  return {
    price: services.reduce((sum, s) => sum + Number(s.price || 0), 0),
    duration: services.reduce((sum, s) => sum + Number(s.durationMinutes || 0), 0),
    names: services.map((s) => s.name).filter(Boolean)
  };
}
