import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchSlots,
  bookAppointment,
  fetchWorkingHours,
  clearReschedule,
  fetchServices,
  fetchBarbersForTenant
} from "../../features/booking/bookingSlice";
import { 
  rescheduleAppointment, 
  reportAppointmentPaymentThunk,
  fetchCustomerAppointments 
} from "../../features/appointments/appointmentsSlice";
import { getSocket } from "../../services/socket";
import BarberProfileModal from "../../components/BarberProfileModal";
import PhoneVerificationModal from "../../components/PhoneVerificationModal";
import Modal from "../../components/Modal";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import { getFriendlyErrorMessage } from "../../utils/errorMessages";
import { toHHMM } from "../../utils/time";

const getPeriodLabel = (hour) => {
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
};

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

const formatHour = (value) => toHHMM(value, "--");
const parseLocalDateString = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const toLocalDateInput = (value) => {
  const date = value ? new Date(value) : new Date();
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatFullDate = (value) => {
  if (!value) return "";
  const parsed = parseLocalDateString(value) || new Date(value);
  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
};
const formatTimeOnly = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  });
};
const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

export default function Slots() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    tenantId,
    services,
    selectedServiceIds,
    selectedBarberId,
    slots,
    slotsLoading,
    slotsError,
    barbers,
    workingHours,
    workingHoursLoading,
    workingHoursError,
    reschedule
  } = useAppSelector(state => state.booking);

  const appointments = useAppSelector(state => state.appointments.items);

  const [date, setDate] = useState(() => toLocalDateInput(reschedule?.startTime));
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const openProfile = () => setProfileModalOpen(true);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isPendingVerification, setIsPendingVerification] = useState(false);
  
  const [prevRescheduleTime, setPrevRescheduleTime] = useState(null);
  if (reschedule?.startTime && reschedule.startTime !== prevRescheduleTime) {
    setDate(toLocalDateInput(reschedule.startTime));
    setPrevRescheduleTime(reschedule.startTime);
  }

  useEffect(() => {
    const tid = reschedule?.tenantId || tenantId;
    if (tid) {
      if (services.length === 0) {
        dispatch(fetchServices(tid));
      }
      if (barbers.length === 0) {
        dispatch(fetchBarbersForTenant({ tenantId: tid }));
      }
    }
  }, [reschedule?.tenantId, tenantId, services.length, barbers.length, dispatch]);

  const selectedDayIndex = useMemo(() => {
    const parsed = parseLocalDateString(date);
    const day = parsed ? parsed.getDay() : 0;
    return Number.isNaN(day) ? 0 : day;
  }, [date]);

  const selectedDayName = DAY_NAMES[selectedDayIndex] || "Today";

  const workingHoursForSelectedDay = useMemo(() => {
    return workingHours.find(entry => Number(entry.DayOfWeek) === selectedDayIndex);
  }, [selectedDayIndex, workingHours]);

  const selectedServices = useMemo(() => {
    const lookup = {};
    services.forEach(service => {
      lookup[service.Id] = service;
    });
    return selectedServiceIds.map(id => lookup[id]).filter(Boolean);
  }, [services, selectedServiceIds]);

  const selectedBarber = useMemo(
    () => barbers.find(b => b.barberId === selectedBarberId),
    [barbers, selectedBarberId]
  );
  
  const user = useAppSelector(state => state.auth.user);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [bookingTime, setBookingTime] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const toFriendlyMessage = (error, fallback) =>
    typeof error === "string" ? error : getFriendlyErrorMessage(error, fallback);

  // 1. Sync local list with socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleUpdate = () => {
      dispatch(fetchCustomerAppointments());
    };

    socket.on("appointments:update", handleUpdate);
    return () => {
      socket.off("appointments:update", handleUpdate);
    };
  }, [dispatch]);

  // 2. Watch appointments list for status change
  useEffect(() => {
    if (!confirmation?.appointmentId || !isPendingVerification) return;

    // Find our current appointment in the global list
    const current = appointments.find(a => a.Id === confirmation.appointmentId);
    
    // If it's now SCHEDULED (1) or any status that isn't AWAITING_PAYMENT (7)
    if (current && current.StatusId !== 7) {
      const timer = setTimeout(() => {
        setIsPendingVerification(false);
        // Optional: Update confirmation state locally to reflect the new status in UI
        setConfirmation(prev => ({ ...prev, statusId: current.StatusId }));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [appointments, confirmation?.appointmentId, isPendingVerification]);

  /* 🚨 Guards */
  useEffect(() => {
    if (confirmation) {
      return;
    }

    if (!tenantId) {
      navigate("/customer");
      return;
    }

    if (!selectedServiceIds.length) {
      navigate("/customer/services");
      return;
    }

    if (!selectedBarberId) {
      navigate("/customer/barbers");
      return;
    }

    dispatch(fetchSlots({
      tenantId,
      barberId: selectedBarberId,
      serviceIds: selectedServiceIds,
      date,
      excludeAppointmentId: reschedule?.appointmentId
    }));
  }, [tenantId, selectedServiceIds, selectedBarberId, date, confirmation, dispatch, navigate, reschedule?.appointmentId]);

  const [now, setNow] = useState(0);

  useEffect(() => {
    // Initialize asynchronously to avoid cascading render warning
    const initTimer = setTimeout(() => setNow(Date.now()), 0);
    const intervalTimer = setInterval(() => setNow(Date.now()), 60000);
    
    return () => {
      clearTimeout(initTimer);
      clearInterval(intervalTimer);
    };
  }, []);

  useEffect(() => {
    if (!selectedBarberId) {
      return;
    }

    dispatch(fetchWorkingHours(selectedBarberId));
  }, [selectedBarberId, dispatch]);

  const sortedSlots = useMemo(() => {
    if (!slots || !slots.length) return [];
    
    const isPastSlot = (time) => {
      const slotDate = new Date(`${date}T${time}:00`);
      return slotDate.getTime() <= now;
    };
    return [...slots]
      .map(slot => ({
        ...slot,
        effectiveAvailable: slot.isAvailable && !isPastSlot(slot.time)
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [slots, date, now]);

  const groupedSlots = useMemo(() => {
    return sortedSlots.reduce((acc, slot) => {
      const hour = Number(slot.time.split(":")[0]);
      const period = getPeriodLabel(hour);
      acc[period] = acc[period] || [];
      acc[period].push(slot);
      return acc;
    }, {});
  }, [sortedSlots]);

  const handleBook = async (time) => {
    if (!user?.isPhoneVerified) {
        setVerificationModalOpen(true);
        return;
    }
    if (selectedServiceIds.length > 0 && selectedServices.length === 0) {
      setError("Loading service details... Please try again in a second.");
      return;
    }
    setError(null);

    // show loading state on the selected slot
    setBookingTime(time);
    setBookingLoading(true);

    const bookedServices = selectedServices.map(service => ({
      id: service.Id,
      name: service.Name,
      duration: service.DurationMinutes ?? 0,
      price: service.Price ?? 0
    }));

    const totalPrice = bookedServices.reduce((sum, service) => sum + Number(service.price || 0), 0);
    const totalServiceDuration = bookedServices.reduce((sum, service) => sum + Number(service.duration || 0), 0);

    setConfirmation({ pending: true });

    try {
      const startTime = `${date}T${time}:00`;
      const payload = reschedule?.appointmentId
        ? await dispatch(
            rescheduleAppointment({
              appointmentId: reschedule.appointmentId,
              startTime
            })
          ).unwrap()
        : await dispatch(
            bookAppointment({
              tenantId,
              barberId: selectedBarberId,
              serviceIds: selectedServiceIds,
              startTime
            })
          ).unwrap();

      setConfirmation({
        appointmentId: reschedule?.appointmentId || payload.appointmentId,
        startTime: payload.startTime || startTime,
        endTime: payload.endTime,
        totalDuration: payload.totalDuration,
        services: bookedServices,
        totalPrice,
        totalServiceDuration,
        barberName: selectedBarber?.fullName ?? "",
        date,
        isReschedule: Boolean(reschedule?.appointmentId),
        statusId: payload.statusId,
        whishPhoneNumber: payload.whishPhoneNumber
      });

      if (reschedule?.appointmentId) {
        dispatch(clearReschedule());
      }
    } catch (err) {
      setConfirmation(null);
      console.error("slot booking error", err);
      
      const serverMessage = typeof err === 'string' ? err : (err?.response?.data?.message || err?.message);
      
      if (serverMessage?.includes("Phone verification required")) {
        setVerificationModalOpen(true);
        return;
      }

      if (serverMessage) {
        setError(toFriendlyMessage(err, "Something went wrong. Please try again."));
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setBookingLoading(false);
      setBookingTime(null);
    }
  };

  const closeConfirmation = () => setConfirmation(null);
  const goToDashboard = () => {
    setConfirmation(null);
    navigate(confirmation?.isReschedule ? "/customer/appointments" : "/customer");
  };

  const handleReportPayment = async () => {
      if (!paymentReference.trim()) return;
      if (!confirmation?.appointmentId) return;

      try {
          await dispatch(reportAppointmentPaymentThunk({
              id: confirmation.appointmentId,
              reference: paymentReference
          })).unwrap();
          
          setPaymentModalOpen(false);
          setIsPendingVerification(true);
      } catch (err) {
          const errMsg = toFriendlyMessage(err, "Failed to report payment.");
          setPaymentError(errMsg);
      }
  };

  const confirmationTiming = confirmation?.appointmentId
    ? {
        dateLabel: formatFullDate(confirmation.startTime),
        timeLabel: `${formatTimeOnly(confirmation.startTime)} – ${formatTimeOnly(confirmation.endTime)}`
      }
    : null;

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:px-6">
        <section className="rounded-[12px] border border-app-border bg-app-surface p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-app-primary">Review &amp; book</p>
              <h1 className="mt-1 text-3xl font-semibold text-app-text">Select a time</h1>
              <p className="text-sm text-app-muted">
                Choose an open spot on {selectedBarber?.fullName ?? "your barber"}&rsquo;s calendar.
              </p>
            </div>
            <label className="flex items-center gap-3 rounded-[25px] border border-app-border bg-app-surface-2 px-4 py-2 text-sm font-semibold text-app-muted">
              <span className="text-[11px] uppercase tracking-wider text-app-muted">Date</span>
              <input
                className="w-[130px] bg-transparent text-base font-semibold text-app-text focus:outline-none"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </label>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="space-y-2 rounded-[12px] border border-app-border bg-app-surface p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-app-muted">Barber</p>
              <div className="text-lg font-semibold text-app-text">
                <button onClick={openProfile} className="hover:underline hover:text-app-primary">
                  {selectedBarber?.fullName ?? "Fetching barber"}
                </button>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-app-muted">
                {selectedBarber?.isAvailable ? "Available now" : "Currently offline"}
              </p>
            </div>
            <div className="space-y-2 rounded-[12px] border border-app-border bg-app-surface p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-app-muted">Services</p>
              <div className="flex flex-wrap gap-2">
                {selectedServices.length
                  ? selectedServices.map(service => (
                      <span
                        key={service.Id}
                        className="rounded-[25px] border border-app-border bg-app-surface-2 px-3 py-1 text-xs font-semibold text-app-muted"
                      >
                        {service.Name}
                      </span>
                    ))
                  : (
                    <span className="text-xs text-app-muted">No services selected</span>
                  )}
              </div>
            </div>
            <div className="space-y-2 rounded-[12px] border border-app-border bg-app-surface p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-app-muted">Working hours</p>
              {workingHoursLoading ? (
                <p className="text-sm text-app-muted">Loading schedule…</p>
              ) : workingHoursError ? (
                <ErrorState message={workingHoursError} />
              ) : workingHoursForSelectedDay ? (
                <>
                  <p className="text-xl font-semibold text-app-text">
                    {formatHour(workingHoursForSelectedDay.StartTime)} – {formatHour(workingHoursForSelectedDay.EndTime)}
                  </p>
                  <p className="text-xs uppercase tracking-[0.3em] text-app-muted">{selectedDayName}</p>
                </>
              ) : (
                <p className="text-sm text-app-muted">
                  {selectedDayName} is currently off. Try another date or barber.
                </p>
              )}
              {!workingHoursLoading && !workingHoursError && (
                <p className="text-[11px] uppercase tracking-[0.3em] text-app-muted">
                  {workingHours.length
                    ? `Showing ${workingHours.length} working day${workingHours.length === 1 ? "" : "s"} this week`
                    : "No schedule configured yet"}
                </p>
              )}
            </div>
          </div>
        </section>

        {error && <ErrorState message={error} />}

        <section className="rounded-[25px] border border-app-border bg-app-surface p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-app-muted">Available slots</p>
              <h2 className="text-xl font-semibold text-app-text">{date}</h2>
            </div>
            <p className="text-xs text-app-muted">
              Showing {sortedSlots.length} slot{sortedSlots.length === 1 ? "" : "s"}
            </p>
          </div>

          {slotsLoading ? (
            <div className="mt-6">
              <LoadingState label="Loading available times..." blocks={2} />
            </div>
          ) : slotsError ? (
            <div className="mt-6">
              <ErrorState message={slotsError} />
            </div>
          ) : sortedSlots.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No slots available"
                description="Try another date or adjust your selected services."
              />
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {Object.entries(groupedSlots).map(([period, times]) => (
                <div key={period} className="rounded-[12px] border border-app-border bg-app-surface-2 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-app-muted">{period}</p>
                    <span className="text-[11px] text-app-muted">{times.length} slot{times.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {times.map(slot => {
                      const isLoading = bookingLoading && bookingTime === slot.time;
                      return (
                        <button
                          key={slot.time}
                          onClick={slot.effectiveAvailable && !isLoading ? () => handleBook(slot.time) : undefined}
                          disabled={!slot.effectiveAvailable || isLoading}
                          className={`rounded-[12px] px-4 py-2 text-sm font-semibold shadow-lg transition flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                            slot.effectiveAvailable && !isLoading
                              ? "bg-app-accent text-white hover:bg-app-accent-dark focus-visible:outline-app-accent"
                              : "bg-app-surface-2 text-app-muted cursor-not-allowed"
                          }`}
                        >
                          {isLoading ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                              <span>Booking...</span>
                            </span>
                          ) : (
                            slot.time
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-3 md:flex-row">
          <button
            onClick={() => navigate("/customer/barbers")}
            className="flex-1 rounded-[12px] border border-app-border bg-app-surface px-6 py-3 text-sm font-semibold text-app-text transition hover:border-app-border"
          >
            ← Back to barbers
          </button>
          <button
            onClick={() => navigate("/customer")}
            className="flex-1 rounded-[12px] bg-app-accent-dark px-6 py-3 text-sm font-semibold text-white transition hover:bg-app-accent"
          >
            Cancel booking
          </button>
        </div>
        {confirmation?.appointmentId && (
          <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-app-bg/60 px-4 py-10">
            {(confirmation.status === "AWAITING_PAYMENT" || confirmation.statusId === 7) ? (
               /* PAYMENT REQUIRED MODAL */
               <div className="w-full max-w-lg rounded-[25px] bg-app-surface p-8 shadow-[0_25px_80px_rgba(15,23,42,0.35)] md:p-10 text-center border-4 border-amber-100">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-amber-900 mb-2">Payment Required</h2>
                  <p className="text-amber-800 mb-6 leading-relaxed">
                      Due to your history of No-Shows, this appointment is pending payment. 
                      You must pay in advance via Whish to confirm it.
                  </p>
                  
                   <div className="bg-amber-50 rounded-xl p-4 mb-8 text-left border border-amber-100">
                      <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Amount Due</span>
                          <span className="text-lg font-bold text-amber-900">{formatCurrency(confirmation.totalPrice)}</span>
                      </div>
                      <p className="text-xs text-amber-700">Please transfer to Whish # <b>{confirmation.whishPhoneNumber || "Contact Support"}</b></p>
                   </div>

                  {!isPendingVerification ? (
                    <button
                      onClick={() => setPaymentModalOpen(true)}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition shadow-lg mb-3"
                    >
                      I have paid via Whish
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-amber-700 font-bold bg-amber-100 py-3 rounded-xl mb-3">
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Verifying...
                    </div>
                  )}

                  <button
                    onClick={() => {
                        setConfirmation(null);
                        navigate("/customer/appointments");
                    }}
                    className="w-full rounded-[12px] bg-app-surface border border-app-border px-6 py-4 text-base font-bold text-app-muted transition hover:bg-app-surface-2"
                  >
                    Go to Payments & Appointments
                  </button>
                   <button
                    onClick={closeConfirmation}
                    className="mt-4 text-sm font-semibold text-app-muted hover:text-app-text"
                  >
                    Close
                  </button>
               </div>
            ) : (confirmation.status === "PENDING" || confirmation.statusId === 5) ? (
              /* PENDING APPROVAL MODAL */
              <div className="w-full max-w-lg rounded-[25px] bg-app-surface p-8 shadow-[0_25px_80px_rgba(15,23,42,0.35)] md:p-10 text-center border-4 border-yellow-100">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-yellow-900 mb-2">Request Pending</h2>
                  <p className="text-yellow-800 mb-8 leading-relaxed">
                      Your appointment request has been sent successfully! <br/>
                      The barber will review and approve it shortly.
                  </p>
                  
                  <button
                    onClick={() => {
                        setConfirmation(null);
                        navigate("/customer/appointments");
                    }}
                    className="w-full rounded-2xl bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-6 py-4 transition shadow-lg shadow-yellow-200"
                  >
                    View My Appointments
                  </button>
                   <button
                    onClick={closeConfirmation}
                    className="mt-4 text-sm font-semibold text-app-muted hover:text-app-text"
                  >
                    Close
                  </button>
               </div>
            ) : (
            <div className="w-full max-w-3xl rounded-[25px] bg-app-surface p-8 shadow-[0_25px_80px_rgba(15,23,42,0.35)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-emerald-100 text-emerald-600 text-2xl font-semibold">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-app-muted">Booking confirmed</p>
                    <p className="text-2xl font-semibold text-app-text">Your appointment is scheduled</p>
                  </div>
                </div>
                <button
                  onClick={closeConfirmation}
                  className="text-sm font-semibold text-app-muted transition hover:text-app-text"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[12px] border border-app-border bg-app-surface-2 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-app-muted">When</p>
                  <p className="text-lg font-semibold text-app-accent">{confirmationTiming?.timeLabel}</p>
                  <p className="text-sm text-app-muted">{confirmationTiming?.dateLabel}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-app-muted">Appointment #{confirmation.appointmentId}</p>
                </div>
                <div className="rounded-[12px] border border-app-border bg-app-surface-2 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-app-muted">Barber</p>
                  <p className="text-lg font-semibold text-app-text">{confirmation.barberName || "—"}</p>
                  <p className="mt-2 text-sm text-app-muted">Service duration {confirmation.totalServiceDuration} min</p>
                  <p className="text-sm text-app-muted">Total block {confirmation.totalDuration} min</p>
                </div>
              </div>

              <div className="mt-6 rounded-[12px] border border-app-border bg-app-surface-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-app-muted">Services</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-app-muted">
                    {confirmation.services.length} item{confirmation.services.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {confirmation.services.map(service => (
                    <div
                      key={service.id}
                      className="flex flex-col rounded-[12px] border border-app-border bg-app-surface px-3 py-2 shadow-sm"
                    >
                      <span className="text-sm font-semibold text-app-text">{service.name}</span>
                      <span className="text-[11px] text-app-muted">
                        {service.duration} min · {formatCurrency(service.price)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between border-t border-app-border pt-4 text-sm text-app-muted">
                  <span className="text-xs uppercase tracking-[0.3em] text-app-muted">Total price</span>
                  <span className="text-lg font-semibold text-app-text">{formatCurrency(confirmation.totalPrice)}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 md:flex-row">
                <button
                  onClick={closeConfirmation}
                  className="flex-1 rounded-[12px] border border-app-border bg-app-surface px-6 py-3 text-sm font-semibold text-app-text shadow-sm transition hover:border-app-border"
                >
                  Close
                </button>
                <button
                  onClick={goToDashboard}
                  className="flex-1 rounded-[12px] bg-app-accent-dark px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-app-accent"
                >
                  Go to dashboard
                </button>
              </div>
            </div>
            )}
          </div>
        )}
      </div>

       <BarberProfileModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)} 
        barberId={selectedBarberId} 
      />

      <PhoneVerificationModal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
      />

      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Report Payment"
      >
        <div className="space-y-4">
            <p className="text-app-muted text-sm">
                Please enter the <strong>Transaction Reference ID</strong> provided by Whish after your transfer.
            </p>
            <div>
              <label className="block text-xs font-bold text-app-muted uppercase tracking-widest mb-1">
                    Reference ID
                </label>
                <input
                    type="text"
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                    placeholder="e.g. 12345678"
                className="w-full rounded-[12px] border border-app-border bg-app-surface-2 px-4 py-3 text-sm font-semibold text-app-text focus:border-app-accent focus:bg-app-surface focus:outline-none focus:ring-4 focus:ring-app-accent/10"
                />
            </div>
            {paymentError && (
              <ErrorState message={paymentError} />
            )}
            <button
              onClick={handleReportPayment}
              className="w-full rounded-[12px] bg-app-accent py-3 text-sm font-bold text-white shadow-lg transition hover:bg-app-accent-dark active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!paymentReference.trim()}
            >
                Submit Payment
            </button>
        </div>
      </Modal>
    </div>
  );
}
