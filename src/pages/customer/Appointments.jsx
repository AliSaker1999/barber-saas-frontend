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

export default function Appointments() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
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
      SCHEDULED: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "📅" },
      PENDING: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", icon: "⏳" },
      COMPLETED: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", icon: "✅" },
      CANCELLED: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: "❌" },
      DECLINED: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", icon: "🚫" },
      NO_SHOW: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "⚠️" },
      AWAITING_PAYMENT: { bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-800", icon: "💲" }
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
        toast.success("Appointment canceled");
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
      toast.success("Payment reported");
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
      toast.success("Paid with loyalty points");
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
        title="My Appointments"
        onBack={() => navigate("/customer")}
        primaryAction={{ label: "Book", onClick: () => navigate("/customer") }}
      />
      {/* Header */}
      <div className="mb-5 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1.5">📅 My Appointments</h1>
        <p className="text-xs sm:text-base text-gray-600 mb-1.5">View, manage, and reschedule your bookings</p>
        {lastFetchedAt && (
          <p className="text-xs text-gray-400 font-bold">
            Last updated {new Date(lastFetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        {isStale && (
          <p className="text-xs text-amber-600 font-bold mt-1">Offline: showing cached data</p>
        )}
      </div>

      {/* Stats Cards / Filters */}
      {!loading && (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7 gap-2 sm:gap-3 mb-6 sm:mb-10">
          <button 
            onClick={() => setFilter("TOTAL")}
            className={`transition-all duration-200 rounded-xl border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "TOTAL" ? "bg-blue-600 border-blue-600 text-white shadow" : "bg-white border-blue-100 text-gray-700 hover:border-blue-300 shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "TOTAL" ? "text-blue-100" : "text-gray-500"}`}>Total</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.length}</p>
          </button>
          
          <button 
            onClick={() => setFilter("SCHEDULED")}
            className={`transition-all duration-200 rounded-xl border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "SCHEDULED" ? "bg-blue-500 border-blue-500 text-white shadow" : "bg-white border-blue-100 text-gray-700 hover:border-blue-300 shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "SCHEDULED" ? "text-blue-100" : "text-gray-500"}`}>Scheduled</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'SCHEDULED').length}</p>
          </button>

          <button 
            onClick={() => setFilter("PENDING")}
            className={`transition-all duration-200 rounded-xl border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "PENDING" ? "bg-indigo-600 border-indigo-600 text-white shadow" : "bg-white border-indigo-100 text-gray-700 hover:border-indigo-300 shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "PENDING" ? "text-indigo-100" : "text-gray-500"}`}>Pending</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'PENDING').length}</p>
          </button>

          <button 
            onClick={() => setFilter("COMPLETED")}
            className={`transition-all duration-200 rounded-xl border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "COMPLETED" ? "bg-green-600 border-green-600 text-white shadow" : "bg-white border-green-100 text-gray-700 hover:border-green-300 shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "COMPLETED" ? "text-green-100" : "text-gray-500"}`}>Completed</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'COMPLETED').length}</p>
          </button>

          <button 
            onClick={() => setFilter("CANCELLED")}
            className={`transition-all duration-200 rounded-xl border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "CANCELLED" ? "bg-red-600 border-red-600 text-white shadow" : "bg-white border-red-100 text-gray-700 hover:border-red-300 shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "CANCELLED" ? "text-red-100" : "text-gray-500"}`}>Cancelled</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'CANCELLED').length}</p>
          </button>

          <button 
            onClick={() => setFilter("DECLINED")}
            className={`transition-all duration-200 rounded-xl border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "DECLINED" ? "bg-gray-600 border-gray-600 text-white shadow" : "bg-white border-gray-100 text-gray-700 hover:border-gray-300 shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "DECLINED" ? "text-gray-100" : "text-gray-500"}`}>Declined</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'DECLINED').length}</p>
          </button>

          <button 
            onClick={() => setFilter("NO_SHOW")}
            className={`transition-all duration-200 rounded-xl border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "NO_SHOW" ? "bg-amber-600 border-amber-600 text-white shadow" : "bg-white border-amber-100 text-gray-700 hover:border-amber-300 shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "NO_SHOW" ? "text-amber-100" : "text-gray-500"}`}>No Show</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'NO_SHOW').length}</p>
          </button>

          <button 
            onClick={() => setFilter("AWAITING_PAYMENT")}
            className={`transition-all duration-200 rounded-xl border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "AWAITING_PAYMENT" ? "bg-amber-500 border-amber-500 text-white shadow" : "bg-white border-amber-100 text-gray-700 hover:border-amber-300 shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "AWAITING_PAYMENT" ? "text-white" : "text-gray-500"}`}>To Pay</p>
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
        <EmptyState title="No appointments found" description={`No ${filter.toLowerCase()} appointments right now.`} />
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
                  className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-2xl hover:scale-[1.01] hover:z-10 transition-all duration-300 cursor-default overflow-hidden"
              >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300" />
                
                  <div className="p-3 sm:p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4 sm:gap-5 md:gap-6">
                  {/* Time Column */}
                    <div className="min-w-[110px] sm:min-w-[140px]">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Time</p>
                    <p className="text-sm font-bold text-gray-900">{date}</p>
                      <p className="text-indigo-600 font-black text-base sm:text-lg">⏰ {time}</p>
                  </div>

                  {/* Details Column */}
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
                       Services at <button onClick={() => openProfile(appointment.BarberId)} className="hover:underline hover:text-indigo-600 font-bold text-gray-500 uppercase">{appointment.BarberName}</button>
                    </p>
                      <p className="text-base sm:text-lg font-bold text-gray-900">{appointment.Services}</p>
                    {appointment.Status === "DECLINED" && appointment.DeclineReason && (
                        <p className="mt-2 text-sm text-red-600 font-medium italic border-l-2 border-red-200 pl-3">
                            <span className="font-bold uppercase text-[10px] block not-italic mb-0.5">Reason for decline:</span>
                            "{appointment.DeclineReason}"
                        </p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {appointment.PaymentStatus === 'PAID' && (
                        <div className="px-3 py-1 bg-green-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">Paid</div>
                    )}
                    {appointment.PaymentStatus === 'PENDING' && (
                        <div className="px-3 py-1 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">Verifying</div>
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
                          className="bg-yellow-50 hover:bg-yellow-600 hover:text-white text-yellow-600 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs transition-all border border-yellow-100 uppercase tap-target"
                        >
                            Rate ★
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
                          className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs transition-all border border-blue-100 uppercase tap-target"
                        >
                          Chat
                        </button>
                        {appointment.PaymentStatus === 'UNPAID' && 
                         ((appointment.IsWhishPaymentEnabled && appointment.WhishPhoneNumber) || (appointment.LoyaltyEnabled && appointment.LoyaltyAllowRedemption)) && (
                          <button
                            onClick={() => openPayModal(appointment)}
                            className="bg-green-50 hover:bg-green-600 hover:text-white text-green-600 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs transition-all border border-green-100 uppercase flex items-center gap-1 tap-target"
                          >
                            <span>💸</span> Pay
                          </button>
                        )}
                        {appointment.Status !== "AWAITING_PAYMENT" && (
                            <button
                              onClick={() => handleReschedule(appointment)}
                              className="bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs transition-all border border-indigo-100 uppercase tap-target"
                            >
                              Reschedule
                            </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedAppointmentId(appointment.Id);
                            setCancelModalOpen(true);
                            setActionError(null);
                          }}
                          className="bg-red-50 hover:bg-red-600 hover:text-white text-red-600 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs transition-all border border-red-100 uppercase tap-target"
                        >
                          Cancel
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
          toast.success("Thank you for your rating!");
        }}
      />
      
      <Modal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title="Payment Options"
      >
        <div className="space-y-6">
          {payDetails?.phone && (
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
              <p className="text-indigo-900 font-medium text-sm mb-1">Send Payment To:</p>
              <p className="text-2xl font-black text-indigo-600 tracking-tight select-all">{payDetails?.phone}</p>
            </div>
          )}
          
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
             <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500 font-bold text-xs uppercase">Amount Due</span>
                <span className="text-gray-900 font-black text-xl">${payDetails?.amount}</span>
             </div>
             <p className="text-xs text-gray-400 leading-relaxed">
               Open your Whish app, select "Transfer", enter the number above, and send the exact amount.
             </p>
          </div>

          <div>
             <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Transaction ID / Reference</label>
             <input 
                type="text" 
                value={transactionId}
                onChange={e => setTransactionId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-indigo-500 font-bold text-gray-900"
                placeholder="Enter the transaction ID from Whish"
             />
          </div>

          {payDetails?.phone && (
            <button
              onClick={handleReportPayment}
              disabled={payLoading}
              className="w-full bg-indigo-600 text-white rounded-xl py-3 font-bold hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-200"
            >
              {payLoading ? "Verifying..." : "Confirm Transfer"}
            </button>
          )}

          {loyaltyLoading && (
            <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl text-gray-500 font-semibold">
              Loading loyalty rewards...
            </div>
          )}

          {loyaltyError && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-red-600 font-semibold">
              {loyaltyError}
            </div>
          )}

          {loyaltyInfo?.settings?.loyaltyEnabled && loyaltyInfo?.settings?.loyaltyAllowRedemption && (
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-amber-900 font-bold">Pay with Loyalty Points</p>
                <span className="text-amber-700 font-black">{loyaltyInfo?.points ?? 0} pts</span>
              </div>
              <select
                value={selectedRewardId}
                onChange={(e) => setSelectedRewardId(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-transparent rounded-xl focus:border-amber-500 font-bold text-gray-900"
              >
                <option value="">Select a reward</option>
                {rewardOptions.map(reward => (
                  <option key={reward.Id} value={reward.Id}>
                    {reward.PointsRequired} pts → {reward.ServiceName}
                  </option>
                ))}
              </select>
              <button
                onClick={handlePayWithLoyalty}
                disabled={payLoading || !selectedRewardId}
                className="w-full bg-amber-600 text-white rounded-xl py-3 font-bold hover:bg-amber-700 transition-all disabled:opacity-50"
              >
                {payLoading ? "Processing..." : "Redeem Points"}
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
        title="Cancel Appointment"
      >
        <div className="p-6 text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Are you sure?</h3>
            <p className="text-gray-500 mb-6">This action cannot be undone. You will lose this time slot.</p>

            {actionError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">
                    {actionError}
                </div>
            )}

            <div className="flex gap-3">
                <button 
                    onClick={() => setCancelModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
                >
                    Keep It
                </button>
                <button 
                    onClick={confirmCancel}
                    className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-lg shadow-red-200"
                >
                    Cancel it
                </button>
            </div>
        </div>
      </Modal>

      {/* Reschedule Error Modal */}
      <Modal
        isOpen={rescheduleErrorModalOpen}
        onClose={() => setRescheduleErrorModalOpen(false)}
        title="Reschedule Issue"
      >
        <div className="p-6 text-center">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Details Missing</h3>
            <p className="text-gray-500 mb-6">We couldn't load the necessary details to reschedule this appointment automatically. Please contact the barbershop.</p>
            <button 
                onClick={() => setRescheduleErrorModalOpen(false)}
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-200"
            >
                Understood
            </button>
        </div>
      </Modal>
    </div>
  );
}
