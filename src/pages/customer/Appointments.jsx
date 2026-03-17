import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchCustomerAppointments,
  cancelAppointment,
  payAppointmentWithLoyaltyThunk,
  reportAppointmentPaymentThunk,
  setCachedAppointments
} from "../../features/appointments/appointmentsSlice";
import { fetchCustomerLoyalty } from "../../features/loyalty/loyaltySlice";
import { openChatWindow } from "../../features/chat/chatSlice";
import {
  selectTenant,
  setSelectedServices,
  selectBarber,
  startReschedule
} from "../../features/booking/bookingSlice";
import { getSocket } from "../../services/socket";
import RateBarberModal from "../../components/RateBarberModal";
import BarberProfileModal from "../../components/BarberProfileModal";
import Modal from "../../components/Modal";
import MobileHeader from "../../components/MobileHeader";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import { getFriendlyErrorMessage } from "../../utils/errorMessages";
import { useI18n } from "../../i18n";

export default function Appointments() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { items, loading, error, lastFetchedAt, isStale } = useAppSelector(s => s.appointments);
  const { user } = useAppSelector(s => s.auth);
  const [filter, setFilter] = useState("SCHEDULED");
  const location = useLocation();
  
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedBarberId, setSelectedBarberId] = useState(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [rescheduleErrorModalOpen, setRescheduleErrorModalOpen] = useState(false);
  const [actionError, setActionError] = useState(null);
  
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payDetails, setPayDetails] = useState(null);
  const [transactionId, setTransactionId] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [selectedRewardId, setSelectedRewardId] = useState("");

  const loyaltyState = useAppSelector(s => s.loyalty.customer);
  const loyaltyInfo = loyaltyState.tenantId === payDetails?.tenantId ? loyaltyState.data : null;
  const loyaltyLoading = loyaltyState.loading && loyaltyState.tenantId === payDetails?.tenantId;
  const loyaltyError = loyaltyState.tenantId === payDetails?.tenantId ? loyaltyState.error : null;

  useEffect(() => {
    dispatch(fetchCustomerAppointments());

    const socket = getSocket();
    if (socket) {
      socket.on("appointments:update", () => {
        dispatch(fetchCustomerAppointments());
      });
    }

    return () => socket?.off("appointments:update");
  }, [dispatch]);

  useEffect(() => {
    if (!navigator.onLine) {
      const cached = localStorage.getItem("customerAppointmentsCache");
      if (cached) {
        const parsed = JSON.parse(cached);
        dispatch(setCachedAppointments(parsed));
      }
    }
  }, [dispatch]);

  useEffect(() => {
    if (!isStale && items) {
      localStorage.setItem(
        "customerAppointmentsCache",
        JSON.stringify({ items, lastFetchedAt: lastFetchedAt || new Date().toISOString() })
      );
    }
  }, [items, isStale, lastFetchedAt]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const appointmentId = params.get("appointmentId");
    if (!appointmentId || loading) return;

    // Detect if we should open rating modal automatically
    const shouldRate = params.get("rate") === "true";
    if (shouldRate && items.length > 0) {
      const appt = items.find(a => a.Id === appointmentId);
      if (appt) {
        setSelectedAppointmentId(appointmentId);
        setSelectedBarberId(appt.BarberId);
        setRateModalOpen(true);
        // Clean up URL
        navigate(`${location.pathname}?appointmentId=${appointmentId}`, { replace: true });
      }
    }

    const el = document.getElementById(`appointment-${appointmentId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.search, location.pathname, loading, items, navigate]);

  const filteredItems = filter === "TOTAL" 
    ? items 
    : items.filter(a => a.Status === filter);

  const getStatusBadge = (status) => {
    const badges = {
      SCHEDULED: { bg: "bg-app-surface-2", border: "border-app-border", text: "text-app-text", icon: "📅" },
      PENDING: { bg: "bg-app-surface-2", border: "border-app-border", text: "text-app-text", icon: "⏳" },
      COMPLETED: { bg: "bg-app-surface-2", border: "border-app-border", text: "text-app-accent", icon: "✅" },
      CANCELLED: { bg: "bg-app-surface-2", border: "border-app-border", text: "text-app-text", icon: "❌" },
      DECLINED: { bg: "bg-app-surface-2", border: "border-app-border", text: "text-app-text", icon: "🚫" },
      NO_SHOW: { bg: "bg-app-surface-2", border: "border-app-border", text: "text-app-accent", icon: "⚠️" },
      AWAITING_PAYMENT: { bg: "bg-app-surface-2", border: "border-app-border", text: "text-app-accent", icon: "💲" }
    };
    return badges[status] || { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", icon: "❓" };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const handleReschedule = (appointment) => {
    const serviceIds = Array.isArray(appointment.services)
      ? Array.from(new Set(appointment.services.map(s => s.id))).filter(Boolean)
      : [];

    if (!appointment.TenantId || !appointment.BarberId || serviceIds.length === 0) {
      setRescheduleErrorModalOpen(true);
      return;
    }

    dispatch(selectTenant(appointment.TenantId));
    dispatch(setSelectedServices(serviceIds));
    dispatch(selectBarber(appointment.BarberId));
    dispatch(startReschedule({
      appointmentId: appointment.Id,
      tenantId: appointment.TenantId,
      barberId: appointment.BarberId,
      serviceIds,
      startTime: appointment.StartTime
    }));

    navigate("/customer/slots");
  };

  const openRateModal = (appt) => {
    setSelectedBarberId(appt.BarberId);
    setSelectedAppointmentId(appt.Id);
    setRateModalOpen(true);
  };

  const openProfile = (barberId) => {
    setSelectedBarberId(barberId);
    setProfileModalOpen(true);
  };

  const confirmCancel = async () => {
    try {
        await dispatch(cancelAppointment(selectedAppointmentId)).unwrap();
        setCancelModalOpen(false);
        toast.success(t("appointment_canceled"));
    } catch (err) {
        setActionError(err);
        toast.error("Failed to cancel appointment");
    }
  };

  const openPayModal = (appt) => {
    const amount = appt.services?.reduce((sum, s) => sum + s.price, 0) || 0;
    setPayDetails({
      id: appt.Id,
      amount,
      phone: appt.WhishPhoneNumber,
      tenantId: appt.TenantId,
      services: appt.services || []
    });
    setTransactionId("");
    setSelectedRewardId("");
    setPayModalOpen(true);

    if (appt.TenantId) {
      dispatch(fetchCustomerLoyalty(appt.TenantId));
    }
  };

  const handleReportPayment = async () => {
    if (!transactionId.trim()) {
      alert("Please enter transaction ID");
      return;
    }
    setPayLoading(true);
    try {
      await dispatch(reportAppointmentPaymentThunk({
        id: payDetails.id,
        reference: transactionId
      })).unwrap();
      setPayModalOpen(false);
      setTransactionId("");
      dispatch(fetchCustomerAppointments());
      toast.success(t("payment_reported"));
    } catch (err) {
      alert(getFriendlyErrorMessage(err, "Failed to report payment"));
      toast.error("Failed to report payment");
    } finally {
      setPayLoading(false);
    }
  };

  const handlePayWithLoyalty = async () => {
    if (!selectedRewardId || !payDetails?.id) {
      alert("Please select a reward");
      return;
    }

    setPayLoading(true);
    try {
      await dispatch(payAppointmentWithLoyaltyThunk({
        id: payDetails.id,
        rewardId: selectedRewardId
      })).unwrap();
      setPayModalOpen(false);
      setSelectedRewardId("");
      toast.success(t("paid_loyalty"));
    } catch (err) {
      setActionError(err);
      toast.error("Failed to redeem loyalty points");
    } finally {
      setPayLoading(false);
    }
  };

  const rewardOptions = (() => {
    if (!loyaltyInfo?.rewards || !payDetails?.services?.length) return [];
    const serviceIds = payDetails.services.map(s => s.id || s.ServiceId).filter(Boolean);
    return loyaltyInfo.rewards.filter(r => serviceIds.includes(r.ServiceId));
  })();

  return (
    <div>
      <MobileHeader
        title={t("my_appointments")}
        onBack={() => navigate("/customer")}
        primaryAction={{ label: t("book_now"), onClick: () => navigate("/customer") }}
      />
      {/* Header */}
      <div className="mb-5 sm:mb-8 bg-app-surface rounded-2xl border border-app-border p-4 sm:p-6">
        <h1 className="text-xl sm:text-3xl font-black text-app-text mb-1">📅 {t("my_appointments")}</h1>
        <p className="text-xs sm:text-sm text-app-muted mb-2">{t("view_manage_bookings")}</p>
        <div className="flex items-center gap-3 flex-wrap">
          {lastFetchedAt && (
            <span className="text-[10px] sm:text-xs text-app-muted font-bold bg-app-surface-2 px-2.5 py-1 rounded-full">
              {t("last_updated")} {new Date(lastFetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {isStale && (
            <span className="text-[10px] sm:text-xs text-app-accent font-bold bg-app-accent/10 px-2.5 py-1 rounded-full">{t("offline_cached")}</span>
          )}
        </div>
      </div>

      {/* Stats Cards / Filters */}
      {!loading && (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2 sm:gap-3 mb-6 sm:mb-10">
          <button 
            onClick={() => setFilter("TOTAL")}
            className={`transition-all duration-200 rounded-[12px] border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "TOTAL" ? "bg-app-accent border-app-accent text-app-text shadow" : "bg-app-surface border-app-border text-app-text hover:border-app-accent shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "TOTAL" ? "text-app-text" : "text-app-muted"}`}>{t("all_statuses")}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.length}</p>
          </button>
          
          <button 
            onClick={() => setFilter("SCHEDULED")}
            className={`transition-all duration-200 rounded-[12px] border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "SCHEDULED" ? "bg-app-accent border-app-accent text-app-text shadow" : "bg-app-surface border-app-border text-app-text hover:border-app-accent shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "SCHEDULED" ? "text-app-text" : "text-app-muted"}`}>{t("status_scheduled")}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'SCHEDULED').length}</p>
          </button>

          <button 
            onClick={() => setFilter("PENDING")}
            className={`transition-all duration-200 rounded-[12px] border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "PENDING" ? "bg-app-accent border-app-accent text-app-text shadow" : "bg-app-surface border-app-border text-app-text hover:border-app-accent shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "PENDING" ? "text-app-text" : "text-app-muted"}`}>{t("status_pending")}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'PENDING').length}</p>
          </button>

          <button 
            onClick={() => setFilter("COMPLETED")}
            className={`transition-all duration-200 rounded-[12px] border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "COMPLETED" ? "bg-app-accent border-app-accent text-app-text shadow" : "bg-app-surface border-app-border text-app-text hover:border-app-accent shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "COMPLETED" ? "text-app-text" : "text-app-muted"}`}>{t("status_completed")}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'COMPLETED').length}</p>
          </button>

          <button 
            onClick={() => setFilter("CANCELLED")}
            className={`transition-all duration-200 rounded-[12px] border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "CANCELLED" ? "bg-app-accent border-app-accent text-app-text shadow" : "bg-app-surface border-app-border text-app-muted hover:border-app-accent shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "CANCELLED" ? "text-red-100" : "text-gray-500"}`}>{t("status_cancelled")}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'CANCELLED').length}</p>
          </button>

          <button 
            onClick={() => setFilter("DECLINED")}
            className={`transition-all duration-200 rounded-[12px] border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "DECLINED" ? "bg-app-accent border-app-accent text-white shadow" : "bg-app-surface border-app-border text-app-text hover:border-app-accent shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "DECLINED" ? "text-white" : "text-app-muted"}`}>{t("status_declined")}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'DECLINED').length}</p>
          </button>

          <button 
            onClick={() => setFilter("NO_SHOW")}
            className={`transition-all duration-200 rounded-[12px] border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "NO_SHOW" ? "bg-app-accent border-app-accent text-white shadow" : "bg-app-surface border-app-border text-app-text hover:border-app-accent shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "NO_SHOW" ? "text-white" : "text-app-muted"}`}>{t("status_no_show")}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'NO_SHOW').length}</p>
          </button>

          <button 
            onClick={() => setFilter("AWAITING_PAYMENT")}
            className={`transition-all duration-200 rounded-[12px] border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "AWAITING_PAYMENT" ? "bg-app-accent border-app-accent text-white shadow" : "bg-app-surface border-app-border text-app-text hover:border-app-accent shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "AWAITING_PAYMENT" ? "text-white" : "text-app-muted"}`}>{t("status_awaiting_payment")}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'AWAITING_PAYMENT').length}</p>
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6">
          <ErrorState message={error} onRetry={() => dispatch(fetchCustomerAppointments())} />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <LoadingState label="Loading appointments..." blocks={3} />
      )}

      {/* Empty State */}
      {!loading && filteredItems.length === 0 && (
        <EmptyState title={t("no_filter_appointments")} description={`${t("no_filter_appointments")}`} />
      )}

      {/* Appointments List */}
      {!loading && filteredItems.length > 0 && (
        <div className="space-y-4">
          {filteredItems.map(appointment => {
            const { date, time } = formatDate(appointment.StartTime);
            const statusBadge = getStatusBadge(appointment.Status);

            return (
              <div
                  key={appointment.Id}
                  id={`appointment-${appointment.Id}`}
                    className="group relative bg-app-surface rounded-2xl border border-app-border shadow-sm hover:shadow-lg hover:scale-[1.005] transition-all duration-300 cursor-default overflow-hidden"
              >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-app-accent rounded-l-2xl" />
                
                  <div className="p-3 sm:p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4 sm:gap-5 md:gap-6">
                  {/* Time Column */}
                    <div className="min-w-[110px] sm:min-w-[140px]">
                    <p className="text-xs text-app-muted font-bold uppercase tracking-wider mb-1">{t("time_label")}</p>
                    <p className="text-sm font-bold text-app-text">{date}</p>
                      <p className="text-app-accent font-black text-base sm:text-lg">⏰ {time}</p>
                  </div>

                  {/* Details Column */}
                  <div className="flex-1">
                      <p className="text-xs text-app-muted font-bold uppercase tracking-wider mb-1">
                        {t("services_at")} <button onClick={() => openProfile(appointment.BarberId)} className="hover:underline hover:text-app-accent font-bold text-app-muted uppercase">{appointment.BarberName}</button>
                      </p>
                       <p className="text-base sm:text-lg font-bold text-app-text">{appointment.Services}</p>
                    {appointment.Status === "DECLINED" && appointment.DeclineReason && (
                        <p className="mt-2 text-sm text-red-600 font-medium italic border-l-2 border-red-200 pl-3">
                            <span className="font-bold uppercase text-[10px] block not-italic mb-0.5">{t("reason_decline")}:</span>
                            "{appointment.DeclineReason}"
                        </p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {appointment.PaymentStatus === 'PAID' && (
                        <div className="px-3 py-1 bg-green-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">{t("paid_label")}</div>
                    )}
                    {appointment.PaymentStatus === 'PENDING' && (
                        <div className="px-3 py-1 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">{t("verifying_label")}</div>
                    )}
                    <div className={`px-3 py-1 rounded-full font-bold text-[11px] sm:text-xs flex items-center gap-1.5 ${statusBadge.bg} border ${statusBadge.border} ${statusBadge.text}`}>
                      <span className="text-sm">{statusBadge.icon}</span> {appointment.Status}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {appointment.Status === "COMPLETED" && (
                        <button
                            onClick={() => openRateModal(appointment)}
                          className="bg-app-surface-2 hover:bg-app-accent hover:text-white text-app-accent px-3 py-1.5 sm:px-4 sm:py-2 rounded-[12px] font-bold text-[10px] sm:text-xs transition-all border border-app-border uppercase tap-target"
                        >
                            {t("rate_star")} ★
                        </button>
                    )}
                    {(appointment.Status === "SCHEDULED" || appointment.Status === "PENDING" || appointment.Status === "AWAITING_PAYMENT") && (
                      <>
                        <button
                          onClick={() => {
                            dispatch(openChatWindow({
                              barberId: appointment.BarberId,
                              customerId: user.id,
                              peerName: appointment.BarberName
                            }));
                            navigate("/customer/conversations");
                          }}
                          className="bg-app-surface-2 hover:bg-app-accent hover:text-white text-app-accent px-3 py-1.5 sm:px-4 sm:py-2 rounded-[12px] font-bold text-[10px] sm:text-xs transition-all border border-app-border uppercase tap-target"
                        >
                          {t("chat")}
                        </button>
                        {appointment.PaymentStatus === 'UNPAID' && 
                         ((appointment.IsWhishPaymentEnabled && appointment.WhishPhoneNumber) || (appointment.LoyaltyEnabled && appointment.LoyaltyAllowRedemption)) && (
                          <button
                            onClick={() => openPayModal(appointment)}
                            className="bg-app-surface-2 hover:bg-app-accent hover:text-white text-app-accent px-3 py-1.5 sm:px-4 sm:py-2 rounded-[12px] font-bold text-[10px] sm:text-xs transition-all border border-app-border uppercase flex items-center gap-1 tap-target"
                          >
                            <span>💸</span> {t("pay_now")}
                          </button>
                        )}
                        {appointment.Status !== "AWAITING_PAYMENT" && (
                            <button
                              onClick={() => handleReschedule(appointment)}
                              className="bg-app-surface-2 hover:bg-app-accent hover:text-white text-app-accent px-3 py-1.5 sm:px-4 sm:py-2 rounded-[12px] font-bold text-[10px] sm:text-xs transition-all border border-app-border uppercase tap-target"
                            >
                              {t("reschedule")}
                            </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedAppointmentId(appointment.Id);
                            setCancelModalOpen(true);
                            setActionError(null);
                          }}
                          className="bg-red-50 hover:bg-red-600 hover:text-white text-red-600 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[12px] font-bold text-[10px] sm:text-xs transition-all border border-red-100 uppercase tap-target"
                        >
                          {t("cancel")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RateBarberModal 
        isOpen={rateModalOpen} 
        onClose={() => setRateModalOpen(false)}
        barberId={selectedBarberId}
        appointmentId={selectedAppointmentId}
        onSuccess={() => {
          setRateModalOpen(false);
          toast.success(t("thank_you_rating"));
        }}
      />
      
      <Modal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title={t("payment_options")}
      >
        <div className="space-y-6">
          {payDetails?.phone && (
            <div className="bg-app-surface-2 border border-app-border p-4 rounded-[25px]">
              <p className="text-app-accent font-medium text-sm mb-1">{t("send_payment_to")}:</p>
              <p className="text-2xl font-black text-app-accent tracking-tight select-all">{payDetails?.phone}</p>
            </div>
          )}
          
          <div className="bg-app-surface-2 p-4 rounded-[25px] border border-app-border">
             <div className="flex justify-between items-center mb-2">
                <span className="text-app-muted font-bold text-xs uppercase">{t("amount_due")}</span>
                <span className="text-app-text font-black text-xl">${payDetails?.amount}</span>
             </div>
             <p className="text-xs text-app-muted leading-relaxed">
               {t("whish_instructions")}
             </p>
          </div>

          <div>
             <label className="block text-xs font-black text-app-muted uppercase tracking-widest mb-2">{t("transaction_id_label")}</label>
             <input 
                type="text" 
                value={transactionId}
                onChange={e => setTransactionId(e.target.value)}
                className="w-full px-4 py-3 bg-app-surface-2 border-app-border rounded-[12px] focus:bg-app-surface focus:border-app-accent font-bold text-app-text"
                placeholder={t("enter_transaction_id")}
             />
          </div>

          {payDetails?.phone && (
            <button
              onClick={handleReportPayment}
              disabled={payLoading}
              className="w-full bg-app-accent text-white rounded-[12px] py-3 font-bold hover:bg-app-accent-dark transition-all active:scale-95 disabled:opacity-50 shadow-lg"
            >
              {payLoading ? t("verifying_payment") : t("confirm_transfer")}
            </button>
          )}

          {loyaltyLoading && (
            <div className="bg-app-surface-2 border border-app-border p-4 rounded-[25px] text-app-muted font-semibold">
              {t("loading_rewards")}
            </div>
          )}

          {loyaltyError && (
            <div className="bg-app-surface-2 border border-app-border p-4 rounded-[25px] text-app-error font-semibold">
              {loyaltyError}
            </div>
          )}

          {loyaltyInfo?.settings?.loyaltyEnabled && loyaltyInfo?.settings?.loyaltyAllowRedemption && (
            <div className="bg-app-surface-2 border border-app-border p-4 rounded-[25px] space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-app-accent font-bold">{t("pay_with_loyalty")}</p>
                <span className="text-app-accent font-black">{loyaltyInfo?.points ?? 0} pts</span>
              </div>
              <select
                value={selectedRewardId}
                onChange={(e) => setSelectedRewardId(e.target.value)}
                className="w-full px-4 py-3 bg-app-surface border-app-border rounded-[12px] focus:border-app-accent font-bold text-app-text"
              >
                <option value="">{t("select_reward")}</option>
                {rewardOptions.map(reward => (
                  <option key={reward.Id} value={reward.Id}>
                    {reward.PointsRequired} pts → {reward.ServiceName}
                  </option>
                ))}
              </select>
              <button
                onClick={handlePayWithLoyalty}
                disabled={payLoading || !selectedRewardId}
                className="w-full bg-app-accent text-white rounded-[12px] py-3 font-bold hover:bg-app-accent-dark transition-all disabled:opacity-50"
              >
                {payLoading ? t("processing") : t("redeem_action")}
              </button>
            </div>
          )}
        </div>
      </Modal>

      <BarberProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        barberId={selectedBarberId}
      />

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title={t("cancel_appointment")}
      >
        <div className="p-6 text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-app-text mb-2">{t("are_you_sure")}</h3>
            <p className="text-app-muted mb-6">{t("cannot_undo")}</p>

            {actionError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">
                    {actionError}
                </div>
            )}

            <div className="flex gap-3">
                <button 
                  onClick={() => setCancelModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-app-surface-2 hover:bg-app-surface text-app-text font-bold rounded-[12px] transition"
                >
                  {t("keep_it")}
                </button>
                <button 
                  onClick={confirmCancel}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-[12px] transition shadow-lg shadow-red-200"
                >
                  {t("cancel_it")}
                </button>
            </div>
        </div>
      </Modal>

      {/* Reschedule Error Modal */}
      <Modal
        isOpen={rescheduleErrorModalOpen}
        onClose={() => setRescheduleErrorModalOpen(false)}
        title={t("reschedule_issue")}
      >
        <div className="p-6 text-center">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-app-text mb-2">{t("details_missing")}</h3>
            <p className="text-app-muted mb-6">{t("details_missing_desc")}</p>
            <button 
              onClick={() => setRescheduleErrorModalOpen(false)}
              className="w-full px-6 py-3 bg-app-accent hover:bg-app-accent-dark text-white font-bold rounded-[12px] transition shadow-lg"
            >
              {t("understood")}
            </button>
        </div>
      </Modal>
    </div>
  );
}
