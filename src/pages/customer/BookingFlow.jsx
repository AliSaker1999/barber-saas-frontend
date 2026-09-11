import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchServices,
  fetchBarbersForTenant,
  fetchSlots,
  bookAppointment,
  selectTenant,
  selectBarber,
  setSelectedServices,
  clearReschedule
} from "../../features/booking/bookingSlice";
import {
  rescheduleAppointment,
  fetchCustomerAppointments
} from "../../features/appointments/appointmentsSlice";
import { fetchTenants } from "../../features/tenants/tenantsSlice";
import { fetchQueueStats } from "../../features/queue/queueSlice";
import { joinWaitlist } from "../../features/waitlist/waitlistSlice";
import api from "../../services/api";

import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import ServiceCard from "../../components/ui/ServiceCard";
import DayPicker from "../../components/ui/DayPicker";
import BarberCard from "../../components/ui/BarberCard";
import BookingSummary from "../../components/ui/BookingSummary";
import PhoneVerificationModal from "../../components/PhoneVerificationModal";
import { Pill } from "../../components/ui/Primitives";
import {
  EmptyState,
  ErrorState,
  InlineError,
  ListSkeleton,
  Skeleton
} from "../../components/ui/States";
import BookingConfirmed from "./BookingConfirmed";
import { useI18n } from "../../i18n";
import {
  formatDuration,
  formatMoney,
  formatTime,
  periodOfDay,
  toLocalDateString
} from "../../utils/format";

/*
 * Booking, in one screen with four steps (spec §10).
 *
 * This replaces a three-page walk (/services → /barbers → /slots) where the
 * back button silently reset the selection. Now:
 *   • the step lives in the URL, so Android's back button steps backwards
 *     through the flow instead of leaving it;
 *   • selections survive going back, forward, and a reload (the booking slice
 *     persists them);
 *   • the earliest available time is surfaced first, so the common case —
 *     "whenever, soon" — is one tap;
 *   • "First available" fans out across the barbers who can do the selected
 *     services and picks whoever can see you soonest.
 */

const STEPS = ["service", "barber", "time", "confirm"];
const FIRST_AVAILABLE = "__first__";

/* ---------------------------------------------------------------------------
   Stepper
   ------------------------------------------------------------------------- */
function Stepper({ current, onJump }) {
  const { t } = useI18n();

  return (
    <ol className="flex items-center gap-1.5 px-4 pb-3">
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;

        return (
          <li key={step} className="flex-1">
            <button
              type="button"
              onClick={() => (done ? onJump(index) : undefined)}
              disabled={!done}
              className="w-full text-start"
            >
              <span
                className={`block h-1 rounded-pill ${
                  done || active ? "bg-brand-gold" : "bg-line-subtle"
                }`}
              />
              <span
                className={`block mt-1.5 text-[10.5px] font-bold uppercase tracking-wide truncate ${
                  active
                    ? "text-brand-gold-text"
                    : done
                    ? "text-content-secondary"
                    : "text-content-muted"
                }`}
              >
                {t(`step_${step}`)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------------------------------------------------------------------
   Screen
   ------------------------------------------------------------------------- */
export default function BookingFlow() {
  const { t, locale } = useI18n();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const booking = useAppSelector((state) => state.booking);
  const shops = useAppSelector((state) => state.tenants.tenants);
  const queueStats = useAppSelector((state) => state.queue.stats);
  const user = useAppSelector((state) => state.auth.user);

  const reschedule = booking.reschedule;
  const tenantId = params.get("shop") || reschedule?.tenantId || booking.tenantId;
  const shop = useMemo(() => shops.find((s) => s.Id === tenantId) || null, [shops, tenantId]);
  const currency = shop?.Currency || "USD";

  const stepIndex = Math.max(0, Math.min(STEPS.length - 1, Number(params.get("step") || 0)));

  const [date, setDate] = useState(() => toLocalDateString(new Date()));
  const [slotTime, setSlotTime] = useState(null);
  const [chosenBarberId, setChosenBarberId] = useState(booking.selectedBarberId || null);
  const [firstAvailable, setFirstAvailable] = useState(false);

  const [multiSlots, setMultiSlots] = useState({ loading: false, byBarber: {}, error: null });
  const [booked, setBooked] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [waitlist, setWaitlist] = useState({ status: "idle", error: null });

  /* ---- bootstrap ---- */
  useEffect(() => {
    if (!shops.length) dispatch(fetchTenants());
  }, [dispatch, shops.length]);

  useEffect(() => {
    if (!tenantId) {
      navigate("/customer/explore", { replace: true });
      return;
    }
    if (booking.tenantId !== tenantId) dispatch(selectTenant(tenantId));
    dispatch(fetchServices(tenantId));
    dispatch(fetchBarbersForTenant({ tenantId }));
    dispatch(fetchQueueStats(tenantId));
  }, [tenantId, booking.tenantId, dispatch, navigate]);

  /* Deep links from Home's "Rebook" and a shop's barber tile arrive with the
     selection already made — honour it and skip straight to the time step. */
  useEffect(() => {
    const preselectServices = params.get("services");
    const preselectBarber = params.get("barber");
    if (!preselectServices && !preselectBarber) return;

    if (preselectServices) {
      dispatch(setSelectedServices(preselectServices.split(",").filter(Boolean)));
    }
    if (preselectBarber) {
      dispatch(selectBarber(preselectBarber));
      setChosenBarberId(preselectBarber);
    }

    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("services");
        next.delete("barber");
        if (preselectServices && preselectBarber) next.set("step", "2");
        else if (preselectBarber) next.set("step", "0");
        return next;
      },
      { replace: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goStep = useCallback(
    (index, { replace = false } = {}) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set("step", String(index));
          return next;
        },
        { replace }
      );
    },
    [setParams]
  );

  /* ---- derived ---- */
  const services = useMemo(
    () => booking.services.filter((s) => s.IsActive !== false),
    [booking.services]
  );

  const selectedServices = useMemo(
    () => services.filter((s) => booking.selectedServiceIds.includes(s.Id)),
    [services, booking.selectedServiceIds]
  );

  const totals = useMemo(
    () => ({
      price: selectedServices.reduce((sum, s) => sum + Number(s.Price || 0), 0),
      duration: selectedServices.reduce((sum, s) => sum + Number(s.DurationMinutes || 0), 0)
    }),
    [selectedServices]
  );

  /* Only barbers who can actually perform every selected service. */
  const eligibleBarbers = useMemo(() => {
    const statsById = new Map((queueStats || []).map((s) => [s.barberId, s]));

    return booking.barbers
      .filter((barber) => {
        if (!booking.selectedServiceIds.length) return true;
        if (!barber.serviceIds?.length) return false;
        return booking.selectedServiceIds.every((id) => barber.serviceIds.includes(id));
      })
      .map((barber) => {
        const stats = statsById.get(barber.barberId);
        return {
          ...barber,
          waitMinutes: stats?.estimatedWaitMinutes ?? null,
          isAcceptingWalkIns: Boolean(stats?.isAcceptingWalkIns && stats?.isWithinHours),
          isAvailable: stats ? stats.isWorkingToday : barber.isAvailable
        };
      });
  }, [booking.barbers, booking.selectedServiceIds, queueStats]);

  const activeBarberId = firstAvailable ? null : chosenBarberId;

  /* ---- slots ---- */
  const loadSingleBarberSlots = useCallback(() => {
    if (!tenantId || !activeBarberId || !booking.selectedServiceIds.length) return;
    dispatch(
      fetchSlots({
        tenantId,
        barberId: activeBarberId,
        serviceIds: booking.selectedServiceIds,
        date,
        excludeAppointmentId: reschedule?.appointmentId
      })
    );
  }, [dispatch, tenantId, activeBarberId, booking.selectedServiceIds, date, reschedule?.appointmentId]);

  /*
   * "First available" needs every eligible barber's day at once. These run in
   * parallel and independently: one barber's failed request loses that barber
   * from the list, not the whole step.
   */
  const loadFirstAvailableSlots = useCallback(async () => {
    if (!tenantId || !booking.selectedServiceIds.length || !eligibleBarbers.length) return;

    setMultiSlots({ loading: true, byBarber: {}, error: null });

    const results = await Promise.allSettled(
      eligibleBarbers.map((barber) =>
        api
          .get(`/barbers/tenants/${tenantId}/barbers/${barber.barberId}/slots`, {
            params: {
              serviceIds: booking.selectedServiceIds,
              date,
              excludeAppointmentId: reschedule?.appointmentId
            }
          })
          .then((res) => ({ barberId: barber.barberId, slots: res.data?.data || [] }))
      )
    );

    const byBarber = {};
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        byBarber[result.value.barberId] = result.value.slots;
      }
    });

    setMultiSlots({
      loading: false,
      byBarber,
      error: Object.keys(byBarber).length ? null : "load-failed"
    });
  }, [tenantId, booking.selectedServiceIds, eligibleBarbers, date, reschedule?.appointmentId]);

  useEffect(() => {
    if (stepIndex !== 2) return;
    setSlotTime(null);
    if (firstAvailable) loadFirstAvailableSlots();
    else loadSingleBarberSlots();
  }, [stepIndex, date, firstAvailable, loadFirstAvailableSlots, loadSingleBarberSlots]);

  /*
   * One list of bookable times for the day. In "first available" mode each
   * time also remembers which barber can take it, so confirming does not need
   * a second round of guessing.
   */
  const timeSlots = useMemo(() => {
    if (firstAvailable) {
      const map = new Map();

      Object.entries(multiSlots.byBarber).forEach(([barberId, slots]) => {
        slots.forEach((slot) => {
          if (!slot.isAvailable) return;
          if (!map.has(slot.time)) map.set(slot.time, { time: slot.time, barberIds: [] });
          map.get(slot.time).barberIds.push(barberId);
        });
      });

      return Array.from(map.values()).sort((a, b) => a.time.localeCompare(b.time));
    }

    return (booking.slots || [])
      .filter((slot) => slot.isAvailable)
      .map((slot) => ({ time: slot.time, barberIds: activeBarberId ? [activeBarberId] : [] }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [firstAvailable, multiSlots.byBarber, booking.slots, activeBarberId]);

  const groupedSlots = useMemo(() => {
    const groups = { morning: [], afternoon: [], evening: [] };
    timeSlots.forEach((slot) => groups[periodOfDay(slot.time)].push(slot));
    return groups;
  }, [timeSlots]);

  const earliest = timeSlots[0] || null;

  const resolvedBarberId = useMemo(() => {
    if (!slotTime) return activeBarberId;
    const slot = timeSlots.find((s) => s.time === slotTime);
    return slot?.barberIds?.[0] || activeBarberId;
  }, [slotTime, timeSlots, activeBarberId]);

  const resolvedBarber = useMemo(
    () => eligibleBarbers.find((b) => b.barberId === resolvedBarberId) || null,
    [eligibleBarbers, resolvedBarberId]
  );

  const slotsLoading = firstAvailable ? multiSlots.loading : booking.slotsLoading;
  const slotsError = firstAvailable ? multiSlots.error : booking.slotsError;

  /* ---- actions ---- */
  const toggleServiceId = (id) => {
    const next = booking.selectedServiceIds.includes(id)
      ? booking.selectedServiceIds.filter((s) => s !== id)
      : [...booking.selectedServiceIds, id];
    dispatch(setSelectedServices(next));
  };

  const chooseBarber = (barberId) => {
    if (barberId === FIRST_AVAILABLE) {
      setFirstAvailable(true);
      setChosenBarberId(null);
      dispatch(selectBarber(null));
    } else {
      setFirstAvailable(false);
      setChosenBarberId(barberId);
      dispatch(selectBarber(barberId));
    }
    goStep(2);
  };

  const confirm = async () => {
    if (!user?.isPhoneVerified) {
      setVerifyOpen(true);
      return;
    }
    if (!slotTime || !resolvedBarberId) return;

    setSubmitting(true);
    const startTime = `${date}T${slotTime}:00`;

    try {
      const payload = reschedule?.appointmentId
        ? await dispatch(
            rescheduleAppointment({ appointmentId: reschedule.appointmentId, startTime })
          ).unwrap()
        : await dispatch(
            bookAppointment({
              tenantId,
              barberId: resolvedBarberId,
              serviceIds: booking.selectedServiceIds,
              startTime
            })
          ).unwrap();

      const promotions = payload?.appliedPromotions || [];
      const discount = promotions.reduce((sum, p) => sum + Number(p.discountApplied || 0), 0);

      setBooked({
        appointmentId: reschedule?.appointmentId || payload?.appointmentId,
        startTime: payload?.startTime || startTime,
        endTime: payload?.endTime,
        statusId: payload?.statusId,
        depositAmount: payload?.depositAmount ?? shop?.DepositAmount ?? null,
        whishPhoneNumber: payload?.whishPhoneNumber,
        isReschedule: Boolean(reschedule?.appointmentId),
        services: selectedServices.map((s) => ({
          id: s.Id,
          name: s.Name,
          price: s.Price,
          durationMinutes: s.DurationMinutes
        })),
        totalPrice: totals.price,
        totalDuration: totals.duration,
        discount,
        barberName: resolvedBarber?.fullName || "",
        shop
      });

      if (reschedule?.appointmentId) dispatch(clearReschedule());
      dispatch(fetchCustomerAppointments());
    } catch (err) {
      const message = typeof err === "string" ? err : err?.message;
      if (message && /phone verification/i.test(message)) {
        setVerifyOpen(true);
      } else {
        toast.error(message || t("error_generic"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const addToWaitlist = async () => {
    setWaitlist({ status: "joining", error: null });
    try {
      await dispatch(
        joinWaitlist({
          tenantId,
          barberId: resolvedBarberId || eligibleBarbers[0]?.barberId,
          serviceIds: booking.selectedServiceIds,
          preferredDate: date
        })
      ).unwrap();
      setWaitlist({ status: "joined", error: null });
    } catch (err) {
      setWaitlist({ status: "idle", error: typeof err === "string" ? err : t("error_generic") });
    }
  };

  /* ---- confirmation takes over the screen ---- */
  if (booked) {
    return <BookingConfirmed booking={booked} currency={currency} />;
  }

  if (!tenantId) return null;

  const canContinue =
    stepIndex === 0
      ? booking.selectedServiceIds.length > 0
      : stepIndex === 1
      ? firstAvailable || Boolean(chosenBarberId)
      : stepIndex === 2
      ? Boolean(slotTime)
      : true;

  return (
    <div className="pb-32">
      <TopBar
        back
        title={reschedule?.appointmentId ? t("reschedule") : t("book_appointment")}
        subtitle={shop?.Name}
        onBack={() => {
          if (stepIndex === 0) navigate(-1);
          else goStep(stepIndex - 1);
        }}
      />

      <Stepper current={stepIndex} onJump={(index) => goStep(index)} />

      {/* ================= STEP 1 — SERVICE ================= */}
      {stepIndex === 0 ? (
        <section className="px-4">
          <h2 className="text-h1 text-content-primary">{t("choose_service_title")}</h2>
          <p className="mt-1 text-body-sm text-content-secondary">{t("choose_service_sub")}</p>

          <div className="mt-4 space-y-2.5">
            {booking.loading && !services.length ? (
              <ListSkeleton count={4} height="h-[68px]" />
            ) : booking.error ? (
              <ErrorState message={booking.error} onRetry={() => dispatch(fetchServices(tenantId))} />
            ) : !services.length ? (
              <EmptyState
                icon="scissors"
                title={t("no_services_title")}
                description={t("no_services_body")}
              />
            ) : (
              services.map((service) => (
                <ServiceCard
                  key={service.Id}
                  service={service}
                  currency={currency}
                  selectable
                  selected={booking.selectedServiceIds.includes(service.Id)}
                  onSelect={() => toggleServiceId(service.Id)}
                />
              ))
            )}
          </div>
        </section>
      ) : null}

      {/* ================= STEP 2 — BARBER ================= */}
      {stepIndex === 1 ? (
        <section className="px-4">
          <h2 className="text-h1 text-content-primary">{t("choose_barber_title")}</h2>
          <p className="mt-1 text-body-sm text-content-secondary">{t("choose_barber_sub")}</p>

          <div className="mt-4 space-y-2.5">
            {booking.barbersLoading && !booking.barbers.length ? (
              <ListSkeleton count={3} />
            ) : booking.barbersError ? (
              <ErrorState
                message={booking.barbersError}
                onRetry={() => dispatch(fetchBarbersForTenant({ tenantId }))}
              />
            ) : !eligibleBarbers.length ? (
              <EmptyState
                icon="users"
                title={t("no_barbers_title")}
                description={t("no_barbers_body")}
                actionLabel={t("back")}
                onAction={() => goStep(0)}
              />
            ) : (
              <>
                {eligibleBarbers.length > 1 ? (
                  <BarberCard
                    barber={{ isFirstAvailable: true }}
                    variant="selectable"
                    selected={firstAvailable}
                    onSelect={() => chooseBarber(FIRST_AVAILABLE)}
                  />
                ) : null}

                {eligibleBarbers.map((barber) => (
                  <BarberCard
                    key={barber.barberId}
                    barber={barber}
                    variant="selectable"
                    selected={!firstAvailable && chosenBarberId === barber.barberId}
                    onSelect={() => chooseBarber(barber.barberId)}
                  />
                ))}
              </>
            )}
          </div>
        </section>
      ) : null}

      {/* ================= STEP 3 — TIME ================= */}
      {stepIndex === 2 ? (
        <section className="px-4">
          <h2 className="text-h1 text-content-primary">{t("choose_time_title")}</h2>
          <p className="mt-1 text-body-sm text-content-secondary">
            {firstAvailable
              ? t("first_available_hint")
              : resolvedBarber?.fullName || shop?.Name}
          </p>

          <div className="mt-4">
            <DayPicker
              value={date}
              onChange={setDate}
              maxDays={shop?.MaxAdvanceBookingDays || 30}
              allowToday={shop?.AllowSameDayBooking !== false}
            />
          </div>

          {/* The earliest time gets its own tap target — most customers want
              "as soon as possible", not a grid to scan. */}
          {earliest && !slotTime ? (
            <button
              type="button"
              onClick={() => setSlotTime(earliest.time)}
              className="press mt-4 w-full flex items-center gap-3 p-3.5 rounded-card bg-brand-gold-soft border border-brand-gold text-start"
            >
              <span className="w-9 h-9 rounded-control bg-brand-gold text-content-on-gold flex items-center justify-center flex-shrink-0">
                <Icon name="sparkle" size={18} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-caption font-semibold text-brand-gold-text uppercase tracking-wide">
                  {t("earliest_today")}
                </span>
                <span className="block text-h2 text-content-primary tnum">
                  {formatTime(`${date}T${earliest.time}:00`, locale)}
                </span>
              </span>
              <Icon name="chevron-right" size={18} className="text-brand-gold-text flex-shrink-0" />
            </button>
          ) : null}

          <div className="mt-5 space-y-5">
            {slotsLoading ? (
              <div className="space-y-4">
                {[1, 2].map((block) => (
                  <div key={block}>
                    <Skeleton className="h-3.5 w-20 mb-2.5" rounded="rounded-pill" />
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-11" rounded="rounded-control" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : slotsError ? (
              <InlineError
                onRetry={firstAvailable ? loadFirstAvailableSlots : loadSingleBarberSlots}
              />
            ) : !timeSlots.length ? (
              <div>
                <EmptyState
                  icon="calendar"
                  title={t("no_times_title")}
                  description={t("no_times_body")}
                />
                {waitlist.status === "joined" ? (
                  <p className="text-body-sm text-state-success text-center px-4">
                    {t("waitlist_joined")}
                  </p>
                ) : (
                  <div className="flex justify-center">
                    <Button
                      variant="secondary"
                      icon="bell"
                      loading={waitlist.status === "joining"}
                      onClick={addToWaitlist}
                    >
                      {t("waitlist_cta")}
                    </Button>
                  </div>
                )}
                {waitlist.error ? (
                  <p className="mt-2 text-caption text-state-danger text-center">{waitlist.error}</p>
                ) : null}
              </div>
            ) : (
              ["morning", "afternoon", "evening"].map((period) =>
                groupedSlots[period].length ? (
                  <div key={period}>
                    <h3 className="text-label uppercase text-content-muted mb-2.5">{t(period)}</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {groupedSlots[period].map((slot) => {
                        const active = slotTime === slot.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => setSlotTime(slot.time)}
                            aria-pressed={active}
                            className={`press h-11 rounded-control border text-body-sm font-semibold tnum transition-colors ${
                              active
                                ? "bg-brand-gold border-brand-gold text-content-on-gold"
                                : "bg-surface-raised border-line-subtle text-content-primary"
                            }`}
                          >
                            {slot.time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null
              )
            )}
          </div>
        </section>
      ) : null}

      {/* ================= STEP 4 — CONFIRM ================= */}
      {stepIndex === 3 ? (
        <section className="px-4">
          <h2 className="text-h1 text-content-primary">{t("confirm_title")}</h2>

          <div className="mt-4">
            <BookingSummary
              shopName={shop?.Name}
              barberName={resolvedBarber?.fullName}
              services={selectedServices.map((s) => ({ name: s.Name }))}
              startTime={slotTime ? `${date}T${slotTime}:00` : null}
              currency={currency}
              totalPrice={totals.price}
              totalDuration={totals.duration}
              depositAmount={shop?.DepositAmount}
              cancellationHours={shop?.CancellationPolicyHours}
              address={[shop?.Street, shop?.Area, shop?.City].filter(Boolean).join(", ") || null}
              paymentNote={shop?.DepositAmount ? null : t("pay_at_shop")}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => goStep(0)}
              className="text-body-sm font-semibold text-brand-gold-text py-1"
            >
              {t("change")} — {t("step_service")}
            </button>
            <span className="text-content-muted">·</span>
            <button
              type="button"
              onClick={() => goStep(2)}
              className="text-body-sm font-semibold text-brand-gold-text py-1"
            >
              {t("change")} — {t("step_time")}
            </button>
          </div>
        </section>
      ) : null}

      {/* ================= sticky footer ================= */}
      <div
        className="fixed inset-x-0 z-40 px-4 pt-3 pb-3 bg-surface-base/95 backdrop-blur-lg border-t border-line-subtle
                   bottom-[calc(theme(spacing.navbar)+env(safe-area-inset-bottom))] lg:bottom-0"
      >
        <div className="max-w-6xl mx-auto">
          {/* A running total, so nobody reaches the last step surprised. */}
          {booking.selectedServiceIds.length ? (
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Pill tone="gold">
                  {t("services_selected", { n: booking.selectedServiceIds.length })}
                </Pill>
                <span className="text-caption text-content-muted tnum truncate">
                  {formatDuration(totals.duration, t)}
                </span>
              </div>
              <span className="text-h3 text-content-primary tnum flex-shrink-0">
                {formatMoney(totals.price, currency)}
              </span>
            </div>
          ) : null}

          {stepIndex === 3 ? (
            <Button block size="lg" loading={submitting} onClick={confirm}>
              {t("confirm_booking")}
            </Button>
          ) : (
            <Button
              block
              size="lg"
              iconEnd="arrow-right"
              disabled={!canContinue}
              onClick={() => goStep(stepIndex + 1)}
            >
              {t("continue_action")}
            </Button>
          )}
        </div>
      </div>

      <PhoneVerificationModal isOpen={verifyOpen} onClose={() => setVerifyOpen(false)} />
    </div>
  );
}
