import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchTenant,
  fetchServices,
  fetchBarbers,
  fetchSlots,
  fetchQueueStats,
  registerGuest,
  requestPhoneVerification,
  confirmPhoneVerification,
  bookAppointment,
  joinQueue,
  joinWaitlist,
  toggleService,
  selectBarber
} from "../../features/publicBooking/publicBookingSlice";
import { setPublicAuthToken } from "../../services/publicApi";

import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import ServiceCard from "../../components/ui/ServiceCard";
import DayPicker from "../../components/ui/DayPicker";
import BarberCard from "../../components/ui/BarberCard";
import BookingSummary from "../../components/ui/BookingSummary";
import { Pill } from "../../components/ui/Primitives";
import { EmptyState, ErrorState, InlineError, ListSkeleton, Skeleton } from "../../components/ui/States";
import PublicBookingDone from "./PublicBookingDone";
import { useI18n } from "../../i18n";
import {
  formatDuration,
  formatMoney,
  formatTime,
  formatWaitRange,
  periodOfDay,
  toLocalDateString
} from "../../utils/format";
import { mergeBarbersWithQueueStats } from "../../utils/shopAvailability";
import { loadGuestSession } from "../../utils/guestSession";

/*
 * Guest reservation — book a time, or join the walk-in line.
 *
 * Structure mirrors the in-app BookingFlow deliberately: the step lives in the
 * URL so Android's back button walks back through the flow instead of leaving
 * it, and selections survive going back, forward and a reload.
 *
 * The one structural difference is identity. A signed-in customer is already
 * known; a guest is asked for a name and number at the END, once they have
 * chosen — spec §10, "do NOT force account registration before value".
 *
 * ?intent=queue arrives from the shop page's "Join queue" button and skips the
 * time step entirely: a walk-in has no appointment time.
 */

const BOOK_STEPS = ["service", "barber", "time", "details"];
const QUEUE_STEPS = ["service", "barber", "details"];

function Stepper({ steps, current }) {
  const { t } = useI18n();

  return (
    <ol className="flex items-center gap-1.5 px-4 pb-3">
      {steps.map((step, index) => (
        <li key={step} className="flex-1">
          <span
            className={`block h-1 rounded-pill ${
              index <= current ? "bg-brand-gold" : "bg-line-subtle"
            }`}
          />
          <span
            className={`block mt-1.5 text-[10.5px] font-bold uppercase tracking-wide truncate ${
              index === current
                ? "text-brand-gold-text"
                : index < current
                ? "text-content-secondary"
                : "text-content-muted"
            }`}
          >
            {t(`step_${step}`)}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function PublicReserve() {
  const { tenantSlug } = useParams();
  const { t, locale } = useI18n();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const state = useAppSelector((s) => s.publicBooking);
  const {
    tenant: shop,
    services,
    servicesLoading,
    servicesError,
    barbers,
    barbersLoading,
    barbersError,
    selectedServiceIds,
    selectedBarberId,
    slots,
    slotsLoading,
    slotsError,
    queueStats,
    guestLoading,
    guestError,
    verificationLoading,
    verificationError,
    bookingLoading,
    queueJoining,
    queueError,
    waitlistJoined,
    waitlistLoading
  } = state;

  const isQueue = params.get("intent") === "queue";
  const steps = isQueue ? QUEUE_STEPS : BOOK_STEPS;
  const stepIndex = Math.max(0, Math.min(steps.length - 1, Number(params.get("step") || 0)));
  const step = steps[stepIndex];

  const [date, setDate] = useState(() => toLocalDateString(new Date()));
  const [slotTime, setSlotTime] = useState(null);
  const [form, setForm] = useState({ fullName: "", phoneNumber: "" });
  const [otp, setOtp] = useState("");
  const [phase, setPhase] = useState("details"); // details | otp | done
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  /* ---- bootstrap ---- */
  useEffect(() => {
    const session = loadGuestSession();
    if (session?.token) {
      setPublicAuthToken(session.token);
      /* Prefill from the earlier attempt so a returning guest isn't retyping
         their own name. */
      setForm((prev) => ({
        fullName: prev.fullName || session.fullName || "",
        phoneNumber: prev.phoneNumber || session.phoneNumber || ""
      }));
    }

    if (!shop) dispatch(fetchTenant(tenantSlug));
    dispatch(fetchServices(tenantSlug));
    dispatch(fetchBarbers(tenantSlug));
    dispatch(fetchQueueStats(tenantSlug));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, tenantSlug]);

  const goStep = useCallback(
    (index) => {
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.set("step", String(index));
        return next;
      });
    },
    [setParams]
  );

  const currency = shop?.Currency || "USD";

  const activeServices = useMemo(
    () => services.filter((s) => s.IsActive !== false),
    [services]
  );

  const selectedServices = useMemo(
    () => activeServices.filter((s) => selectedServiceIds.includes(s.Id)),
    [activeServices, selectedServiceIds]
  );

  const totals = useMemo(
    () => ({
      price: selectedServices.reduce((sum, s) => sum + Number(s.Price || 0), 0),
      duration: selectedServices.reduce((sum, s) => sum + Number(s.DurationMinutes || 0), 0)
    }),
    [selectedServices]
  );

  const mergedBarbers = useMemo(
    () => mergeBarbersWithQueueStats(barbers, queueStats),
    [barbers, queueStats]
  );

  /* Only barbers who can perform every selected service — and, for a walk-in,
     who are actually on the floor taking them right now. */
  const eligibleBarbers = useMemo(() => {
    const canDoAll = mergedBarbers.filter((barber) => {
      if (!selectedServiceIds.length) return true;
      if (!barber.serviceIds?.length) return false;
      return selectedServiceIds.every((id) => barber.serviceIds.includes(id));
    });

    return isQueue ? canDoAll.filter((b) => b.isAcceptingWalkIns) : canDoAll;
  }, [mergedBarbers, selectedServiceIds, isQueue]);

  const selectedBarber = useMemo(
    () => eligibleBarbers.find((b) => b.barberId === selectedBarberId) || null,
    [eligibleBarbers, selectedBarberId]
  );

  /* ---- slots ---- */
  useEffect(() => {
    if (step !== "time" || !selectedBarberId || !selectedServiceIds.length) return;
    setSlotTime(null);
    dispatch(
      fetchSlots({ slug: tenantSlug, barberId: selectedBarberId, serviceIds: selectedServiceIds, date })
    );
  }, [dispatch, step, tenantSlug, selectedBarberId, selectedServiceIds, date]);

  const timeSlots = useMemo(
    () => (slots || []).filter((s) => s.isAvailable).sort((a, b) => a.time.localeCompare(b.time)),
    [slots]
  );

  const groupedSlots = useMemo(() => {
    const groups = { morning: [], afternoon: [], evening: [] };
    timeSlots.forEach((slot) => groups[periodOfDay(slot.time)].push(slot));
    return groups;
  }, [timeSlots]);

  const earliest = timeSlots[0] || null;

  /* ---- submit ---- */
  const finish = useCallback(
    async (verifiedAlready) => {
      setSubmitting(true);
      try {
        if (isQueue) {
          await dispatch(
            joinQueue({
              tenantId: shop.Id,
              slug: tenantSlug,
              barberId: selectedBarberId,
              serviceIds: selectedServiceIds
            })
          ).unwrap();

          navigate(`/book/${tenantSlug}/queue`, { replace: true });
          return;
        }

        const startTime = `${date}T${slotTime}:00`;
        const payload = await dispatch(
          bookAppointment({
            slug: tenantSlug,
            barberId: selectedBarberId,
            serviceIds: selectedServiceIds,
            startTime
          })
        ).unwrap();

        setResult({
          ...payload,
          startTime: payload?.startTime || startTime,
          services: selectedServices.map((s) => ({
            id: s.Id,
            name: s.Name,
            price: s.Price,
            durationMinutes: s.DurationMinutes
          })),
          totalPrice: totals.price,
          totalDuration: totals.duration,
          barberName: selectedBarber?.fullName || "",
          shop
        });
        setPhase("done");
      } catch (err) {
        const message = typeof err === "string" ? err : err?.message;

        /* The server names the shop when a guest is already in someone else's
           line, which is far more useful than a generic failure. */
        toast.error(message || t("error_generic"));

        if (verifiedAlready && /verification/i.test(String(message))) {
          setPhase("otp");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [
      dispatch,
      isQueue,
      shop,
      tenantSlug,
      selectedBarberId,
      selectedServiceIds,
      date,
      slotTime,
      selectedServices,
      totals,
      selectedBarber,
      navigate,
      t
    ]
  );

  const submitDetails = async () => {
    if (!form.fullName.trim() || !form.phoneNumber.trim()) return;

    setSubmitting(true);
    try {
      const created = await dispatch(
        registerGuest({
          slug: tenantSlug,
          fullName: form.fullName.trim(),
          phoneNumber: form.phoneNumber.trim()
        })
      ).unwrap();

      /* An existing, already-verified number can go straight through — no
         point re-verifying a phone we've verified before. */
      if (created?.user?.isPhoneVerified) {
        await finish(true);
        return;
      }

      await dispatch(
        requestPhoneVerification({ slug: tenantSlug, phoneNumber: form.phoneNumber.trim() })
      ).unwrap();
      setPhase("otp");
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setSubmitting(false);
    }
  };

  const submitOtp = async () => {
    if (otp.trim().length < 4) return;

    setSubmitting(true);
    try {
      await dispatch(
        confirmPhoneVerification({
          slug: tenantSlug,
          code: otp.trim(),
          phoneNumber: form.phoneNumber.trim()
        })
      ).unwrap();

      await finish(true);
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setSubmitting(false);
    }
  };

  const addToWaitlist = async () => {
    try {
      await dispatch(
        joinWaitlist({
          slug: tenantSlug,
          barberId: selectedBarberId,
          serviceIds: selectedServiceIds,
          preferredDate: date
        })
      ).unwrap();
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    }
  };

  /* ---- confirmation takes over ---- */
  if (phase === "done" && result) {
    return <PublicBookingDone booking={result} currency={currency} slug={tenantSlug} />;
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-surface-base">
        <TopBar back title={t("book_appointment")} />
        <div className="px-4 space-y-3">
          <Skeleton className="h-5 w-40" rounded="rounded-pill" />
          <ListSkeleton count={3} />
        </div>
      </div>
    );
  }

  const canContinue =
    step === "service"
      ? selectedServiceIds.length > 0
      : step === "barber"
      ? Boolean(selectedBarberId)
      : step === "time"
      ? Boolean(slotTime)
      : false;

  const onBack = () => {
    if (phase === "otp") {
      setPhase("details");
      return;
    }
    if (stepIndex === 0) navigate(`/book/${tenantSlug}`);
    else goStep(stepIndex - 1);
  };

  return (
    <div className="min-h-screen bg-surface-base pb-32">
      <TopBar
        back
        onBack={onBack}
        title={isQueue ? t("join_queue_action") : t("book_appointment")}
        subtitle={shop.Name}
      />

      {phase === "details" ? <Stepper steps={steps} current={stepIndex} /> : null}

      {/* ================= SERVICE ================= */}
      {phase === "details" && step === "service" ? (
        <section className="px-4">
          <h2 className="text-h1 text-content-primary">{t("choose_service_title")}</h2>
          <p className="mt-1 text-body-sm text-content-secondary">{t("choose_service_sub")}</p>

          <div className="mt-4 space-y-2.5">
            {servicesLoading && !services.length ? (
              <ListSkeleton count={4} height="h-[68px]" />
            ) : servicesError ? (
              <ErrorState message={servicesError} onRetry={() => dispatch(fetchServices(tenantSlug))} />
            ) : !activeServices.length ? (
              <EmptyState
                icon="scissors"
                title={t("no_services_title")}
                description={t("no_services_body")}
              />
            ) : (
              activeServices.map((service) => (
                <ServiceCard
                  key={service.Id}
                  service={service}
                  currency={currency}
                  selectable
                  selected={selectedServiceIds.includes(service.Id)}
                  onSelect={() => dispatch(toggleService(service.Id))}
                />
              ))
            )}
          </div>
        </section>
      ) : null}

      {/* ================= BARBER ================= */}
      {phase === "details" && step === "barber" ? (
        <section className="px-4">
          <h2 className="text-h1 text-content-primary">{t("choose_barber_title")}</h2>
          <p className="mt-1 text-body-sm text-content-secondary">
            {isQueue ? t("choose_barber_queue_sub") : t("choose_barber_sub")}
          </p>

          <div className="mt-4 space-y-2.5">
            {barbersLoading && !barbers.length ? (
              <ListSkeleton count={3} />
            ) : barbersError ? (
              <ErrorState message={barbersError} onRetry={() => dispatch(fetchBarbers(tenantSlug))} />
            ) : !eligibleBarbers.length ? (
              <EmptyState
                icon="users"
                title={isQueue ? t("walk_ins_closed") : t("no_barbers_title")}
                description={isQueue ? t("walk_ins_closed_hint") : t("no_barbers_body")}
                actionLabel={t("back")}
                onAction={() => goStep(0)}
              />
            ) : (
              eligibleBarbers.map((barber) => (
                <BarberCard
                  key={barber.barberId}
                  barber={barber}
                  variant="selectable"
                  selected={selectedBarberId === barber.barberId}
                  onSelect={() => {
                    dispatch(selectBarber(barber.barberId));
                    goStep(stepIndex + 1);
                  }}
                />
              ))
            )}
          </div>
        </section>
      ) : null}

      {/* ================= TIME ================= */}
      {phase === "details" && step === "time" ? (
        <section className="px-4">
          <h2 className="text-h1 text-content-primary">{t("choose_time_title")}</h2>
          <p className="mt-1 text-body-sm text-content-secondary">
            {selectedBarber?.fullName || shop.Name}
          </p>

          <div className="mt-4">
            <DayPicker
              value={date}
              onChange={setDate}
              maxDays={shop.MaxAdvanceBookingDays}
              allowToday={shop.AllowSameDayBooking !== false}
            />
          </div>

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
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-11" rounded="rounded-control" />
                ))}
              </div>
            ) : slotsError ? (
              <InlineError
                message={slotsError}
                onRetry={() =>
                  dispatch(
                    fetchSlots({
                      slug: tenantSlug,
                      barberId: selectedBarberId,
                      serviceIds: selectedServiceIds,
                      date
                    })
                  )
                }
              />
            ) : !timeSlots.length ? (
              <div>
                <EmptyState
                  icon="calendar"
                  title={t("no_times_title")}
                  description={t("no_times_body")}
                />
                {waitlistJoined ? (
                  <p className="text-body-sm text-state-success text-center px-4">
                    {t("waitlist_joined")}
                  </p>
                ) : (
                  <div className="flex justify-center">
                    <Button
                      variant="secondary"
                      icon="bell"
                      loading={waitlistLoading}
                      onClick={addToWaitlist}
                    >
                      {t("waitlist_cta")}
                    </Button>
                  </div>
                )}
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

      {/* ================= DETAILS (name + phone) ================= */}
      {phase === "details" && step === "details" ? (
        <section className="px-4">
          <h2 className="text-h1 text-content-primary">{t("guest_details_title")}</h2>
          <p className="mt-1 text-body-sm text-content-secondary">{t("guest_details_sub")}</p>

          <div className="mt-4">
            <BookingSummary
              shopName={shop.Name}
              barberName={selectedBarber?.fullName}
              services={selectedServices.map((s) => ({ name: s.Name }))}
              startTime={!isQueue && slotTime ? `${date}T${slotTime}:00` : null}
              currency={currency}
              totalPrice={totals.price}
              totalDuration={totals.duration}
              depositAmount={shop.DepositAmount}
              cancellationHours={shop.CancellationPolicyHours}
              address={[shop.Street, shop.Area, shop.City].filter(Boolean).join(", ") || null}
              paymentNote={shop.DepositAmount ? null : t("pay_at_shop")}
            />
          </div>

          {isQueue && selectedBarber?.waitMinutes != null ? (
            <p className="mt-3 text-body-sm text-content-secondary tnum">
              {t("queue_expected_wait")}:{" "}
              <span className="font-bold text-content-primary">
                {formatWaitRange(selectedBarber.waitMinutes, t)}
              </span>
            </p>
          ) : null}

          <div className="mt-5 space-y-3.5">
            <label className="block">
              <span className="block text-label uppercase text-content-muted mb-1.5">
                {t("full_name")}
              </span>
              <input
                value={form.fullName}
                onChange={(event) => setForm((f) => ({ ...f, fullName: event.target.value }))}
                autoComplete="name"
                className="w-full h-12 px-3.5 rounded-control bg-surface-raised border border-line-subtle
                           text-body text-content-primary focus:border-brand-gold focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="block text-label uppercase text-content-muted mb-1.5">
                {t("phone_number")}
              </span>
              <input
                value={form.phoneNumber}
                onChange={(event) => setForm((f) => ({ ...f, phoneNumber: event.target.value }))}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                placeholder="03 123 456"
                className="w-full h-12 px-3.5 rounded-control bg-surface-raised border border-line-subtle
                           text-body text-content-primary tnum focus:border-brand-gold focus:outline-none"
              />
            </label>

            <p className="text-caption text-content-muted">{t("verify_phone_body")}</p>
            {guestError ? <p className="text-caption text-state-danger">{guestError}</p> : null}
            {queueError ? <p className="text-caption text-state-danger">{queueError}</p> : null}
          </div>
        </section>
      ) : null}

      {/* ================= OTP ================= */}
      {phase === "otp" ? (
        <section className="px-4 pt-2">
          <h2 className="text-h1 text-content-primary">{t("verify_phone_title")}</h2>
          <p className="mt-1 text-body-sm text-content-secondary">
            {t("otp_sent_to", { phone: form.phoneNumber })}
          </p>

          <label className="block mt-5">
            <span className="block text-label uppercase text-content-muted mb-1.5">
              {t("otp_code_label")}
            </span>
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              maxLength={6}
              className="w-full h-14 px-4 rounded-control bg-surface-raised border border-line-subtle
                         text-h1 text-center tracking-[0.4em] text-content-primary tnum
                         focus:border-brand-gold focus:outline-none"
            />
          </label>

          {verificationError ? (
            <p className="mt-2 text-caption text-state-danger">{verificationError}</p>
          ) : null}

          <div className="mt-3 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              loading={verificationLoading}
              onClick={() =>
                dispatch(
                  requestPhoneVerification({ slug: tenantSlug, phoneNumber: form.phoneNumber.trim() })
                )
              }
            >
              {t("otp_resend")}
            </Button>
          </div>
        </section>
      ) : null}

      {/* ================= sticky footer ================= */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-surface-base/95 backdrop-blur-lg border-t border-line-subtle">
        <div className="max-w-md mx-auto">
          {selectedServiceIds.length && phase === "details" ? (
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Pill tone="gold">{t("services_selected", { n: selectedServiceIds.length })}</Pill>
                <span className="text-caption text-content-muted tnum truncate">
                  {formatDuration(totals.duration, t)}
                </span>
              </div>
              <span className="text-h3 text-content-primary tnum flex-shrink-0">
                {formatMoney(totals.price, currency)}
              </span>
            </div>
          ) : null}

          {phase === "otp" ? (
            <Button
              block
              size="lg"
              loading={submitting || bookingLoading || queueJoining}
              disabled={otp.trim().length < 4}
              onClick={submitOtp}
            >
              {isQueue ? t("join_queue_action") : t("confirm_booking")}
            </Button>
          ) : step === "details" ? (
            <Button
              block
              size="lg"
              loading={submitting || guestLoading || bookingLoading || queueJoining}
              disabled={!form.fullName.trim() || !form.phoneNumber.trim()}
              onClick={submitDetails}
            >
              {isQueue ? t("join_queue_action") : t("confirm_booking")}
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
    </div>
  );
}
