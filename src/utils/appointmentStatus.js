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
  AWAITING_PAYMENT: "AWAITING_PAYMENT"
};

const ID_TO_NAME = {
  1: APPOINTMENT_STATUS.SCHEDULED,
  2: APPOINTMENT_STATUS.COMPLETED,
  3: APPOINTMENT_STATUS.CANCELLED,
  4: APPOINTMENT_STATUS.NO_SHOW,
  5: APPOINTMENT_STATUS.PENDING,
  6: APPOINTMENT_STATUS.DECLINED,
  7: APPOINTMENT_STATUS.AWAITING_PAYMENT
};

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
