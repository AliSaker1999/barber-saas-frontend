import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchTenant,
  fetchServices,
  fetchBarbers,
  fetchSlots,
  registerGuest,
  requestPhoneVerification,
  confirmPhoneVerification,
  bookAppointment,
  createDepositCheckoutSession,
  joinWaitlist,
  toggleService,
  selectBarber,
  resetPublicBooking
} from "../../features/publicBooking/publicBookingSlice";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import { captureAcquisitionSource } from "../../utils/acquisition";

const toLocalDateInput = (value) => {
  const date = value ? new Date(value) : new Date();
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

const STEPS = ["services", "barber", "slots", "guest", "otp", "done"];

export default function PublicBooking() {
  const { tenantSlug } = useParams();
  const dispatch = useAppDispatch();
  const {
    tenant, tenantLoading, tenantError,
    services, servicesLoading,
    barbers, barbersLoading,
    selectedServiceIds, selectedBarberId,
    slots, slotsLoading,
    guestLoading, guestError,
    verificationLoading, verificationError,
    booking, bookingLoading, bookingError,
    waitlistJoined, waitlistLoading, waitlistError
  } = useAppSelector(s => s.publicBooking);

  const [step, setStep] = useState("services");
  const [intent, setIntent] = useState("book"); // "book" | "waitlist"
  const [date, setDate] = useState(() => toLocalDateInput());
  const [selectedTime, setSelectedTime] = useState(null);
  const [guestForm, setGuestForm] = useState({ fullName: "", phoneNumber: "" });
  const [otpCode, setOtpCode] = useState("");
  const [formError, setFormError] = useState(null);
  const [depositRedirecting, setDepositRedirecting] = useState(false);

  const handlePayDeposit = async () => {
    if (!booking?.appointmentId) return;
    setDepositRedirecting(true);
    setFormError(null);
    try {
      const result = await dispatch(createDepositCheckoutSession(booking.appointmentId)).unwrap();
      if (result?.url) {
        window.open(result.url, "_self");
      } else {
        setDepositRedirecting(false);
      }
    } catch (err) {
      setFormError(err || "Failed to start deposit payment. Please try again.");
      setDepositRedirecting(false);
    }
  };

  useEffect(() => {
    /* Record which of the shop's channels this visit came from before any
       navigation drops the ?src= tag from the URL. */
    captureAcquisitionSource();

    dispatch(resetPublicBooking());
    dispatch(fetchTenant(tenantSlug));
    dispatch(fetchServices(tenantSlug));
  }, [dispatch, tenantSlug]);

  const selectedServices = useMemo(
    () => services.filter(s => selectedServiceIds.includes(s.Id)),
    [services, selectedServiceIds]
  );
  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.Price || 0), 0);

  const eligibleBarbers = useMemo(
    () => barbers.filter(b => selectedServiceIds.every(id => b.serviceIds.includes(id))),
    [barbers, selectedServiceIds]
  );

  const selectedBarber = eligibleBarbers.find(b => b.barberId === selectedBarberId);

  const goToBarberStep = () => {
    if (selectedServiceIds.length === 0) {
      setFormError("Pick at least one service to continue.");
      return;
    }
    setFormError(null);
    dispatch(fetchBarbers(tenantSlug));
    setStep("barber");
  };

  const goToSlotsStep = (barberId) => {
    dispatch(selectBarber(barberId));
    setStep("slots");
    dispatch(fetchSlots({ slug: tenantSlug, barberId, serviceIds: selectedServiceIds, date }));
  };

  useEffect(() => {
    if (step === "slots" && selectedBarberId) {
      dispatch(fetchSlots({ slug: tenantSlug, barberId: selectedBarberId, serviceIds: selectedServiceIds, date }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const handlePickSlot = (time) => {
    setIntent("book");
    setSelectedTime(time);
    setStep("guest");
  };

  const handleJoinWaitlistIntent = () => {
    setIntent("waitlist");
    setSelectedTime(null);
    setStep("guest");
  };

  const confirmAndFinish = async () => {
    if (intent === "waitlist") {
      await dispatch(joinWaitlist({
        slug: tenantSlug,
        barberId: selectedBarberId,
        serviceIds: selectedServiceIds,
        preferredDate: date
      })).unwrap();
    } else {
      await dispatch(bookAppointment({
        slug: tenantSlug,
        barberId: selectedBarberId,
        serviceIds: selectedServiceIds,
        startTime: `${date}T${selectedTime}:00`
      })).unwrap();
    }
    setStep("done");
  };

  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!guestForm.fullName.trim() || !guestForm.phoneNumber.trim()) {
      setFormError("Name and phone number are required.");
      return;
    }
    try {
      const result = await dispatch(registerGuest({
        slug: tenantSlug,
        fullName: guestForm.fullName.trim(),
        phoneNumber: guestForm.phoneNumber.trim()
      })).unwrap();

      if (result.user.isPhoneVerified) {
        await confirmAndFinish();
      } else {
        await dispatch(requestPhoneVerification({ slug: tenantSlug, phoneNumber: guestForm.phoneNumber.trim() })).unwrap();
        setStep("otp");
      }
    } catch (err) {
      setFormError(err || "Something went wrong. Please try again.");
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!otpCode.trim()) {
      setFormError("Enter the code you received.");
      return;
    }
    try {
      await dispatch(confirmPhoneVerification({
        slug: tenantSlug,
        code: otpCode.trim(),
        phoneNumber: guestForm.phoneNumber.trim()
      })).unwrap();
      await confirmAndFinish();
    } catch (err) {
      setFormError(err || "Invalid or expired code.");
    }
  };

  if (tenantLoading) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md"><LoadingState label="Loading shop..." blocks={3} /></div>
      </div>
    );
  }

  if (tenantError || !tenant) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <EmptyState title="Shop not found" description={tenantError || "This booking link is invalid or the shop is no longer active."} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-app-surface border border-app-border flex items-center justify-center font-black text-xl text-blue-600 overflow-hidden">
            {tenant.LogoUrl ? <img src={tenant.LogoUrl} alt={tenant.Name} className="w-full h-full object-cover" /> : tenant.Name?.[0]}
          </div>
          <div>
            <h1 className="text-xl font-black text-app-text">{tenant.Name}</h1>
            <p className="text-xs text-app-muted">Book an appointment</p>
          </div>
        </div>

        {formError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 text-sm font-semibold">
            {formError}
          </div>
        )}

        {step === "services" && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-app-muted">1. Choose services</h2>
            {servicesLoading && <LoadingState label="Loading services..." blocks={3} />}
            {!servicesLoading && services.length === 0 && (
              <EmptyState title="No services available" description="This shop hasn't listed any services yet." />
            )}
            <div className="space-y-2">
              {services.filter(s => s.IsActive !== false).map(service => {
                const isSelected = selectedServiceIds.includes(service.Id);
                return (
                  <button
                    key={service.Id}
                    onClick={() => dispatch(toggleService(service.Id))}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-colors ${
                      isSelected ? "border-blue-500 bg-blue-50" : "border-app-border bg-app-surface"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-app-text">{service.Name}</p>
                      <p className="text-xs text-app-muted">{service.DurationMinutes} min</p>
                    </div>
                    <span className="font-bold text-app-text">{formatCurrency(service.Price)}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={goToBarberStep}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition"
            >
              Continue{totalPrice > 0 ? ` · ${formatCurrency(totalPrice)}` : ""}
            </button>
          </div>
        )}

        {step === "barber" && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-app-muted">2. Choose a barber</h2>
            {barbersLoading && <LoadingState label="Loading barbers..." blocks={2} />}
            {!barbersLoading && eligibleBarbers.length === 0 && (
              <EmptyState title="No barbers available" description="No barber currently covers all the services you picked." />
            )}
            <div className="space-y-2">
              {eligibleBarbers.map(barber => (
                <button
                  key={barber.barberId}
                  onClick={() => goToSlotsStep(barber.barberId)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-app-border bg-app-surface text-left hover:border-blue-400 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center">
                    {barber.profileImage ? (
                      <img src={barber.profileImage} alt={barber.fullName} className="w-full h-full object-cover" />
                    ) : <span>👤</span>}
                  </div>
                  <div>
                    <p className="font-bold text-app-text">{barber.fullName}</p>
                    <p className="text-xs text-app-muted">⭐ {barber.averageRating || 0} ({barber.reviewsCount || 0})</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep("services")} className="text-sm font-bold text-app-muted hover:text-app-text">
              ← Back
            </button>
          </div>
        )}

        {step === "slots" && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-app-muted">3. Choose a time</h2>
            <input
              type="date"
              value={date}
              min={toLocalDateInput()}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-app-border rounded-xl bg-app-surface text-app-text"
            />
            {slotsLoading && <LoadingState label="Loading available times..." blocks={2} />}
            {!slotsLoading && slots.filter(s => s.isAvailable).length === 0 && (
              <div className="space-y-3">
                <EmptyState title="No times available" description="Try a different date." />
                <button
                  onClick={handleJoinWaitlistIntent}
                  className="w-full bg-app-surface-2 text-app-text font-bold py-3 rounded-xl border border-app-border hover:bg-app-surface transition"
                >
                  Join Waitlist for {date}
                </button>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {slots.filter(s => s.isAvailable).map(slot => (
                <button
                  key={slot.time}
                  onClick={() => handlePickSlot(slot.time)}
                  className="py-2.5 rounded-xl border border-app-border bg-app-surface font-bold text-sm text-app-text hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  {slot.time}
                </button>
              ))}
            </div>
            <button onClick={() => setStep("barber")} className="text-sm font-bold text-app-muted hover:text-app-text">
              ← Back
            </button>
          </div>
        )}

        {step === "guest" && (
          <form onSubmit={handleGuestSubmit} className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-app-muted">4. Your details</h2>
            <div className="bg-app-surface border border-app-border rounded-2xl p-4 text-sm text-app-muted">
              {intent === "waitlist" ? (
                <p><b className="text-app-text">Waitlist</b> · {selectedBarber?.fullName} · {date}</p>
              ) : (
                <p><b className="text-app-text">{selectedBarber?.fullName}</b> · {date} at {selectedTime}</p>
              )}
              <p className="mt-1">{selectedServices.map(s => s.Name).join(", ")} · {formatCurrency(totalPrice)}</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-app-text mb-1">Full name</label>
              <input
                type="text"
                required
                value={guestForm.fullName}
                onChange={e => setGuestForm(f => ({ ...f, fullName: e.target.value }))}
                className="w-full px-4 py-2.5 border border-app-border rounded-xl bg-app-surface text-app-text"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-app-text mb-1">Phone number</label>
              <input
                type="tel"
                required
                value={guestForm.phoneNumber}
                onChange={e => setGuestForm(f => ({ ...f, phoneNumber: e.target.value }))}
                className="w-full px-4 py-2.5 border border-app-border rounded-xl bg-app-surface text-app-text"
                placeholder="e.g. 71234567"
              />
              <p className="text-xs text-app-muted mt-1">We'll text you a code to confirm it's you.</p>
            </div>
            <button
              type="submit"
              disabled={guestLoading || verificationLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-60"
            >
              {guestLoading || verificationLoading ? "Please wait..." : "Continue"}
            </button>
            {guestError && <p className="text-sm text-red-600 font-semibold">{guestError}</p>}
            <button type="button" onClick={() => setStep("slots")} className="text-sm font-bold text-app-muted hover:text-app-text">
              ← Back
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-app-muted">5. Verify your phone</h2>
            <p className="text-sm text-app-muted">
              Enter the 6-digit code sent to <b className="text-app-text">{guestForm.phoneNumber}</b>.
            </p>
            <input
              type="text"
              inputMode="numeric"
              required
              value={otpCode}
              onChange={e => setOtpCode(e.target.value)}
              className="w-full px-4 py-3 border border-app-border rounded-xl bg-app-surface text-app-text text-center text-2xl font-black tracking-[0.4em]"
              placeholder="000000"
              maxLength={6}
            />
            <button
              type="submit"
              disabled={verificationLoading || bookingLoading || waitlistLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-60"
            >
              {verificationLoading || bookingLoading || waitlistLoading
                ? "Please wait..."
                : intent === "waitlist" ? "Join Waitlist" : "Confirm booking"}
            </button>
            {(verificationError || bookingError || waitlistError) && (
              <p className="text-sm text-red-600 font-semibold">{verificationError || bookingError || waitlistError}</p>
            )}
            <button
              type="button"
              onClick={() => dispatch(requestPhoneVerification({ slug: tenantSlug, phoneNumber: guestForm.phoneNumber.trim() }))}
              className="text-sm font-bold text-blue-600 hover:text-blue-700"
            >
              Resend code
            </button>
          </form>
        )}

        {step === "done" && intent === "waitlist" && waitlistJoined && (
          <div className="bg-app-surface border border-app-border rounded-2xl p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-3xl">✓</div>
            <h2 className="text-xl font-black text-app-text">You're on the waitlist!</h2>
            <p className="text-sm text-app-muted">
              {selectedBarber?.fullName} · {date}
            </p>
            <p className="text-xs text-app-muted">
              We'll text and email you the moment a matching slot opens up. You'll need to come back and book it yourself — we don't hold it automatically.
            </p>
          </div>
        )}

        {step === "done" && intent === "book" && booking && (
          <div className="bg-app-surface border border-app-border rounded-2xl p-6 text-center space-y-3">
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl ${
              booking.status === "AWAITING_PAYMENT" ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
            }`}>
              {booking.status === "AWAITING_PAYMENT" ? "!" : "✓"}
            </div>
            <h2 className="text-xl font-black text-app-text">
              {booking.status === "AWAITING_PAYMENT"
                ? "Deposit required to confirm"
                : booking.status === "PENDING"
                  ? "Request sent!"
                  : "Booking confirmed!"}
            </h2>
            <p className="text-sm text-app-muted">
              {selectedBarber?.fullName} · {date} at {selectedTime}
            </p>
            {booking.appliedPromotions?.length > 0 && (
              <p className="text-sm font-bold text-emerald-700">
                Promotion applied · -{formatCurrency(booking.appliedPromotions.reduce((sum, p) => sum + Number(p.discountApplied || 0), 0))}
              </p>
            )}

            {booking.status === "AWAITING_PAYMENT" && booking.depositAmount ? (
              <div className="pt-2 space-y-3">
                <p className="text-sm text-amber-700 font-semibold">
                  This shop requires a {formatCurrency(booking.depositAmount)} deposit to hold your slot.
                </p>
                {formError && <p className="text-sm text-red-600 font-semibold">{formError}</p>}
                <button
                  onClick={handlePayDeposit}
                  disabled={depositRedirecting}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-60"
                >
                  {depositRedirecting ? "Redirecting to payment..." : `Pay ${formatCurrency(booking.depositAmount)} deposit`}
                </button>
              </div>
            ) : (
              <p className="text-xs text-app-muted">
                A confirmation has been saved to your account under this phone number. Keep it handy if you'd like to book again.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
