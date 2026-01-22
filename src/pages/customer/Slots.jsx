import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchSlots,
  bookAppointment,
  fetchWorkingHours,
  clearReschedule,
  fetchServices
} from "../../features/booking/bookingSlice";
import { rescheduleAppointment } from "../../features/appointments/appointmentsSlice";

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

const formatHour = (value) => (value ? value.slice(0, 5) : "--");
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

  const [date, setDate] = useState(() => toLocalDateInput(reschedule?.startTime));
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  
  const [prevRescheduleTime, setPrevRescheduleTime] = useState(null);
  if (reschedule?.startTime && reschedule.startTime !== prevRescheduleTime) {
    setDate(toLocalDateInput(reschedule.startTime));
    setPrevRescheduleTime(reschedule.startTime);
  }

  useEffect(() => {
    if (reschedule?.tenantId && services.length === 0) {
      dispatch(fetchServices(reschedule.tenantId));
    }
  }, [reschedule?.tenantId, services.length, dispatch]);

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
    setError(null);

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
        isReschedule: Boolean(reschedule?.appointmentId)
      });

      if (reschedule?.appointmentId) {
        dispatch(clearReschedule());
      }
    } catch (err) {
      setConfirmation(null);
      console.error("slot booking error", err);
      
      // Since we use .unwrap(), err is the value from rejectWithValue (the message string)
      // or the standard error object if not caught by thunk
      const serverMessage = typeof err === 'string' ? err : (err?.response?.data?.message || err?.message);
      
      if (serverMessage) {
        setError(serverMessage);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  };

  const closeConfirmation = () => setConfirmation(null);
  const goToDashboard = () => {
    setConfirmation(null);
    navigate(confirmation?.isReschedule ? "/customer/appointments" : "/customer");
  };

  const confirmationTiming = confirmation?.appointmentId
    ? {
        dateLabel: formatFullDate(confirmation.startTime),
        timeLabel: `${formatTimeOnly(confirmation.startTime)} – ${formatTimeOnly(confirmation.endTime)}`
      }
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:px-6">
        <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl shadow-slate-200 backdrop-blur">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">Review &amp; book</p>
              <h1 className="mt-1 text-3xl font-semibold text-slate-900">Select a time</h1>
              <p className="text-sm text-slate-500">
                Choose an open spot on {selectedBarber?.fullName ?? "your barber"}&rsquo;s calendar.
              </p>
            </div>
            <label className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 shadow-inner">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Date</span>
              <input
                className="w-[130px] bg-transparent text-base font-semibold text-slate-900 focus:outline-none"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </label>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Barber</p>
              <p className="text-lg font-semibold text-slate-900">
                {selectedBarber?.fullName ?? "Fetching barber"}
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                {selectedBarber?.isAvailable ? "Available now" : "Currently offline"}
              </p>
            </div>
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Services</p>
              <div className="flex flex-wrap gap-2">
                {selectedServices.length
                  ? selectedServices.map(service => (
                      <span
                        key={service.Id}
                        className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                      >
                        {service.Name}
                      </span>
                    ))
                  : (
                    <span className="text-xs text-slate-500">No services selected</span>
                  )}
              </div>
            </div>
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Working hours</p>
              {workingHoursLoading ? (
                <p className="text-sm text-slate-500">Loading schedule…</p>
              ) : workingHoursError ? (
                <p className="text-sm font-semibold text-rose-600">{workingHoursError}</p>
              ) : workingHoursForSelectedDay ? (
                <>
                  <p className="text-xl font-semibold text-slate-900">
                    {formatHour(workingHoursForSelectedDay.StartTime)} – {formatHour(workingHoursForSelectedDay.EndTime)}
                  </p>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{selectedDayName}</p>
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  {selectedDayName} is currently off. Try another date or barber.
                </p>
              )}
              {!workingHoursLoading && !workingHoursError && (
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                  {workingHours.length
                    ? `Showing ${workingHours.length} working day${workingHours.length === 1 ? "" : "s"} this week`
                    : "No schedule configured yet"}
                </p>
              )}
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
            {error}
          </div>
        )}

        <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl shadow-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Available slots</p>
              <h2 className="text-xl font-semibold text-slate-900">{date}</h2>
            </div>
            <p className="text-xs text-slate-500">
              Showing {sortedSlots.length} slot{sortedSlots.length === 1 ? "" : "s"}
            </p>
          </div>

          {slotsLoading ? (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-blue-600"></div>
              <p className="text-sm text-slate-500">Loading available times…</p>
            </div>
          ) : slotsError ? (
            <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center text-sm font-semibold text-rose-600">
              {slotsError}
            </div>
          ) : sortedSlots.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center text-sm text-slate-500">
              No slots are available on this date yet. Try another day or update your services.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {Object.entries(groupedSlots).map(([period, times]) => (
                <div key={period} className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{period}</p>
                    <span className="text-[11px] text-slate-500">{times.length} slot{times.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {times.map(slot => (
                      <button
                        key={slot.time}
                        onClick={slot.effectiveAvailable ? () => handleBook(slot.time) : undefined}
                        disabled={!slot.effectiveAvailable}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                          slot.effectiveAvailable
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:brightness-110 focus-visible:outline-indigo-500"
                            : "bg-slate-200 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-3 md:flex-row">
          <button
            onClick={() => navigate("/customer/barbers")}
            className="flex-1 rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            ← Back to barbers
          </button>
          <button
            onClick={() => navigate("/customer")}
            className="flex-1 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Cancel booking
          </button>
        </div>
        {confirmation?.appointmentId && (
          <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-10">
            <div className="w-full max-w-3xl rounded-3xl bg-white p-8 shadow-[0_25px_80px_rgba(15,23,42,0.35)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 text-2xl font-semibold">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Booking confirmed</p>
                    <p className="text-2xl font-semibold text-slate-900">Your appointment is scheduled</p>
                  </div>
                </div>
                <button
                  onClick={closeConfirmation}
                  className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">When</p>
                  <p className="text-lg font-semibold text-indigo-600">{confirmationTiming?.timeLabel}</p>
                  <p className="text-sm text-slate-500">{confirmationTiming?.dateLabel}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-slate-400">Appointment #{confirmation.appointmentId}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Barber</p>
                  <p className="text-lg font-semibold text-slate-900">{confirmation.barberName || "—"}</p>
                  <p className="mt-2 text-sm text-slate-500">Service duration {confirmation.totalServiceDuration} min</p>
                  <p className="text-sm text-slate-500">Total block {confirmation.totalDuration} min</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Services</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    {confirmation.services.length} item{confirmation.services.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {confirmation.services.map(service => (
                    <div
                      key={service.id}
                      className="flex flex-col rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                    >
                      <span className="text-sm font-semibold text-slate-900">{service.name}</span>
                      <span className="text-[11px] text-slate-500">
                        {service.duration} min · {formatCurrency(service.price)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Total price</span>
                  <span className="text-lg font-semibold text-slate-900">{formatCurrency(confirmation.totalPrice)}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 md:flex-row">
                <button
                  onClick={closeConfirmation}
                  className="flex-1 rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400"
                >
                  Close
                </button>
                <button
                  onClick={goToDashboard}
                  className="flex-1 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800"
                >
                  Go to dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
