import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchAppointments,
  cancelAppointment,
  markNoShow,
  completeAppointment,
  acceptAppointment,
  declineAppointment,
  notifyCustomer,
  arriveForAppointment,
  verifyPayment,
  clearAppointmentsError
} from "../../features/appointments/appointmentsSlice";
import { openChatWindow } from "../../features/chat/chatSlice";
import { fetchCustomerDetails, clearSelectedCustomer } from "../../features/customers/customersSlice";
import { getSocket } from "../../services/socket";
import CustomerModal from "../../components/CustomerModal";
import Modal from "../../components/Modal";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";

export default function Appointments() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, loading, error, lastFetchedAt } = useAppSelector(s => s.appointments);
  const [filter, setFilter] = useState("SCHEDULED");
  const [dateMode, setDateMode] = useState("today"); // 'today', 'future', 'custom', 'all'
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [declineModal, setDeclineModal] = useState({ isOpen: false, appointmentId: null, reason: "" });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    action: null,
    btnText: "",
    btnColor: ""
  });

  const handleOpenCustomer = (customerId) => {
    dispatch(fetchCustomerDetails({ customerId }));
    setIsModalOpen(true);
  };

  const tenantId = useAppSelector(state => state.auth.user?.tenantId);

  const toLocalDate = (date) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const fetchCurrent = () => {
     let params = {};
     const today = toLocalDate(new Date());
     
     if (dateMode === 'today') {
        params = { startDate: today, endDate: today };
      } else if (dateMode === 'future') {
        const tom = new Date();
        tom.setDate(tom.getDate() + 1);
        params = { startDate: toLocalDate(tom) };
     } else if (dateMode === 'custom') {
        if (!customRange.start || !customRange.end) return;
        params = { startDate: customRange.start, endDate: customRange.end };
     }
     
     dispatch(fetchAppointments(params));
  };

  useEffect(() => {
    fetchCurrent();

    const socket = getSocket();
    if (socket && tenantId) {
      socket.emit("join-tenant", tenantId);
      socket.on("appointments:update", fetchCurrent);
    }

    return () => {
        if (socket) {
            socket.off("appointments:update");
        }
    };
  }, [dispatch, tenantId, dateMode, customRange.start, customRange.end]);

  const filteredItems = (() => {
    if (filter === "TOTAL") return items;
    if (filter === "PAYMENT_PENDING") return items.filter(a => a.PaymentStatus === 'PENDING');
    return items.filter(a => a.Status === filter);
  })();

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { bg: "bg-app-surface-2", border: "border-app-border", text: "text-app-text", icon: "⏳" },
      SCHEDULED: { bg: "bg-app-surface-2", border: "border-app-border", text: "text-app-text", icon: "📅" },
      COMPLETED: { bg: "bg-app-accent/10", border: "border-app-accent/30", text: "text-app-accent", icon: "✅" },
      CANCELLED: { bg: "bg-app-surface-2", border: "border-app-border", text: "text-app-text", icon: "❌" },
      DECLINED: { bg: "bg-app-surface-2", border: "border-app-border", text: "text-app-text", icon: "🚫" },
      NO_SHOW: { bg: "bg-app-surface-2", border: "border-app-border", text: "text-app-text", icon: "⚠️" },
      AWAITING_PAYMENT: { bg: "bg-app-surface-2", border: "border-app-border", text: "text-app-text", icon: "💳" }
    };
    return badges[status] || badges.SCHEDULED;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-5 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold text-app-text mb-1.5">📅 Appointments</h1>
        <p className="text-xs sm:text-base text-app-muted mb-1.5">Manage and track all salon appointments</p>
        {lastFetchedAt && (
          <p className="text-xs text-app-muted font-bold mb-6">
            Last updated {new Date(lastFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        
        {/* Date Filters */}
        <div className="bg-app-surface p-2.5 sm:p-4 rounded-[12px] shadow-sm border border-app-border flex flex-wrap gap-2 items-center">
          <span className="font-semibold text-sm text-app-text mr-1">Show:</span>
            
            <button
              onClick={() => setDateMode("today")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${dateMode === "today" ? "bg-app-accent text-white" : "bg-app-surface-2 text-app-text hover:bg-app-surface"}`}
            >
                Today
            </button>
            <button
                onClick={() => setDateMode("future")}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${dateMode === "future" ? "bg-app-accent text-white" : "bg-app-surface-2 text-app-text hover:bg-app-surface"}`}
            >
                Future
            </button>
            <button
                onClick={() => setDateMode("all")}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${dateMode === "all" ? "bg-app-accent text-white" : "bg-app-surface-2 text-app-text hover:bg-app-surface"}`}
            >
                All Time
            </button>
            <button
                onClick={() => setDateMode("custom")}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${dateMode === "custom" ? "bg-app-accent text-white" : "bg-app-surface-2 text-app-text hover:bg-app-surface"}`}
            >
                Custom Range
            </button>

            {dateMode === "custom" && (
                <div className="flex items-center gap-2 ml-1 sm:ml-2 animate-fadeIn">
                    <input 
                      type="date" 
                      value={customRange.start}
                      onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                      className="border border-app-border rounded-[12px] px-3 py-2 text-sm focus:ring-2 focus:ring-app-accent outline-none"
                    />
                    <span className="text-app-muted">to</span>
                    <input 
                      type="date" 
                      value={customRange.end}
                      onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                      className="border border-app-border rounded-[12px] px-3 py-2 text-sm focus:ring-2 focus:ring-app-accent outline-none"
                    />
                </div>
            )}
        </div>
      </div>

      {/* Stats Cards / Filters */}
      {!loading && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3 mb-6 sm:mb-10">
          <button 
            onClick={() => setFilter("TOTAL")}
            className={`transition-all duration-200 rounded-[12px] border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "TOTAL" ? "bg-app-accent border-app-accent text-white shadow" : "bg-app-surface border-app-border text-app-text hover:border-app-accent shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "TOTAL" ? "text-white" : "text-app-muted"}`}>Total</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.length}</p>
          </button>

          {/* Payment Verification Filter */}
          <button 
            onClick={() => setFilter("PAYMENT_PENDING")}
            className={`transition-all duration-200 rounded-[12px] border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "PAYMENT_PENDING" ? "bg-app-accent border-app-accent text-white shadow" : "bg-app-surface border-app-border text-app-text hover:border-app-accent shadow-sm"}`}
          >
            <div className="flex items-center justify-between">
                <p className={`text-xs sm:text-sm font-semibold ${filter === "PAYMENT_PENDING" ? "text-amber-100" : "text-amber-600"}`}>Verify Payment</p>
                {items.filter(a => a.PaymentStatus === 'PENDING').length > 0 && (
                    <span className="bg-app-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">Action</span>
                )}
            </div>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.PaymentStatus === 'PENDING').length}</p>
          </button>

          <button 
            onClick={() => setFilter("PENDING")}
            className={`transition-all duration-200 rounded-[12px] border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "PENDING" ? "bg-app-accent border-app-accent text-white shadow" : "bg-app-surface border-app-border text-app-text hover:border-app-accent shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "PENDING" ? "text-white" : "text-app-muted"}`}>Pending</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'PENDING').length}</p>
          </button>

          <button 
            onClick={() => setFilter("AWAITING_PAYMENT")}
            className={`transition-all duration-200 rounded-[12px] border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "AWAITING_PAYMENT" ? "bg-app-accent border-app-accent text-white shadow" : "bg-app-surface border-app-border text-app-text hover:border-app-accent shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "AWAITING_PAYMENT" ? "text-white" : "text-app-muted"}`}>Restricted</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'AWAITING_PAYMENT').length}</p>
          </button>
          
          <button 
            onClick={() => setFilter("SCHEDULED")}
            className={`transition-all duration-200 rounded-[12px] border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "SCHEDULED" ? "bg-app-accent border-app-accent text-white shadow" : "bg-app-surface border-app-border text-app-text hover:border-app-accent shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "SCHEDULED" ? "text-white" : "text-app-muted"}`}>Scheduled</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'SCHEDULED').length}</p>
          </button>

          <button 
            onClick={() => setFilter("COMPLETED")}
            className={`transition-all duration-200 rounded-[12px] border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "COMPLETED" ? "bg-app-accent border-app-accent text-white shadow" : "bg-app-surface border-app-border text-app-text hover:border-app-accent shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "COMPLETED" ? "text-white" : "text-app-muted"}`}>Completed</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'COMPLETED').length}</p>
          </button>

          <button 
            onClick={() => setFilter("CANCELLED")}
            className={`transition-all duration-200 rounded-[12px] border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "CANCELLED" ? "bg-app-accent border-app-accent text-white shadow" : "bg-app-surface border-app-border text-app-text hover:border-app-accent shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "CANCELLED" ? "text-white" : "text-app-muted"}`}>Cancelled</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'CANCELLED').length}</p>
          </button>

          <button 
            onClick={() => setFilter("NO_SHOW")}
            className={`transition-all duration-200 rounded-[12px] border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "NO_SHOW" ? "bg-app-accent border-app-accent text-white shadow" : "bg-app-surface border-app-border text-app-text hover:border-app-accent shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "NO_SHOW" ? "text-white" : "text-app-muted"}`}>No Show</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'NO_SHOW').length}</p>
          </button>

          <button 
            onClick={() => setFilter("DECLINED")}
            className={`transition-all duration-200 rounded-[12px] border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left ${filter === "DECLINED" ? "bg-app-surface-2 border-app-border text-app-text shadow" : "bg-app-surface border-app-border text-app-text hover:border-app-accent shadow-sm"}`}
          >
            <p className={`text-xs sm:text-sm font-semibold ${filter === "DECLINED" ? "text-app-text" : "text-app-muted"}`}>Declined</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{items.filter(a => a.Status === 'DECLINED').length}</p>
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6">
          <ErrorState message={error} onRetry={() => dispatch(clearAppointmentsError())} retryLabel="Dismiss" />
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

      {/* Appointments List (List to Card on Hover) */}
      {!loading && filteredItems.length > 0 && (
        <div className="space-y-4">
          {filteredItems.map(appointment => {
            const { date, time } = formatDate(appointment.StartTime);
            const statusBadge = getStatusBadge(appointment.Status);

            return (
              <div
                key={appointment.Id}
                className="group relative bg-app-surface rounded-[12px] border border-app-border shadow-sm hover:shadow-2xl hover:scale-[1.02] hover:z-10 transition-all duration-300 cursor-default overflow-hidden"
              >
                {/* Decoration for hover */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-app-accent transform scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300" />
                
                <div className="p-3 sm:p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4 sm:gap-5 md:gap-6">
                  {/* Date & Time Column */}
                  <div className="min-w-[110px] sm:min-w-[140px]">
                    <p className="text-xs text-app-muted font-bold uppercase tracking-wider mb-1">Schedule</p>
                    <p className="text-sm font-bold text-app-text">{date}</p>
                    <p className="text-app-accent font-black text-base sm:text-lg">⏰ {time}</p>
                  </div>

                  {/* Customer Column */}
                  <div className="flex-1">
                    <p className="text-xs text-app-muted font-bold uppercase tracking-wider mb-1">Customer</p>
                    <button 
                      onClick={() => handleOpenCustomer(appointment.CustomerId)}
                      className="text-base sm:text-lg font-bold text-app-text hover:text-app-accent transition-colors pointer-events-auto text-left block"
                    >
                      {appointment.CustomerName}
                    </button>
                    <p className="text-xs sm:text-sm text-app-muted truncate max-w-xs">{appointment.Services}</p>
                  </div>

                  {/* Barber Column */}
                  <div className="hidden lg:block min-w-[150px]">
                    <p className="text-xs text-app-muted font-bold uppercase tracking-wider mb-1">Barber</p>
                    <p className="text-sm font-bold text-app-text">{appointment.BarberName}</p>
                  </div>

                  {/* Status & Payment Badge */}
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full font-bold text-[11px] sm:text-xs flex items-center gap-1.5 ${statusBadge.bg} border ${statusBadge.border} ${statusBadge.text}`}>
                      <span className="text-sm">{statusBadge.icon}</span> {appointment.Status}
                    </div>
                    
                    {appointment.PaymentStatus && appointment.PaymentStatus !== 'UNPAID' && (
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider flex items-center gap-1 ${
                            appointment.PaymentStatus === 'PAID' 
                            ? 'bg-app-accent/10 text-app-accent border-app-accent/30' 
                            : 'bg-app-surface-2 text-app-text border-app-border'
                        }`}>
                            {appointment.PaymentStatus === 'PENDING' ? '⏳ Verifying' : '💰 Paid'}
                        </div>
                    )}
                    {appointment.PaymentReference && (
                       <p className="text-[10px] font-mono text-app-muted mt-1">Ref: {appointment.PaymentReference}</p>
                    )}
                  </div>

                  {/* Actions (Only visible/expanded on hover or always if Scheduled) */}
                  <div className="flex gap-2">
                    {/* Verify Payment Button (High Priority) */}
                    {appointment.PaymentStatus === 'PENDING' && (
                         <button
                            onClick={() => setConfirmModal({
                                isOpen: true,
                                title: "Verify Payment",
                                message: (
                                  <div>
                                    <p className="mb-2">Confirm receipt of payment?</p>
                                    <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm text-center">
                                      Ref: <strong>{appointment.PaymentReference || "N/A"}</strong>
                                    </div>
                                  </div>
                                ),
                                action: () => dispatch(verifyPayment(appointment.Id)),
                                btnText: "Verify & Mark Paid",
                                btnColor: "bg-app-accent hover:bg-app-accent-dark"
                            })}
                            className="bg-app-surface-2 hover:bg-app-surface text-app-text px-3 py-2 rounded-lg transition-all border border-app-border font-bold flex items-center gap-2 text-sm shadow-sm animate-pulse"
                            title={`Verify Reference: ${appointment.PaymentReference}`}
                         >
                            💰 Verify
                         </button>
                    )}

                    {/* Communication Buttons */}
                    {(appointment.Status === "SCHEDULED" || appointment.Status === "PENDING") && (
                      <>
                        <button
                          onClick={() => {
                            dispatch(openChatWindow({
                              barberId: appointment.BarberId,
                              customerId: appointment.CustomerId,
                              peerName: appointment.CustomerName
                            }));
                            navigate("/company/conversations");
                          }}
                          className="bg-app-accent hover:bg-app-accent-dark text-white p-2 rounded-lg transition-all shadow-sm flex items-center justify-center mr-2 tap-target"
                          title="Internal Chat"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        </button>
                        {appointment.CustomerPhone && (
                           <a
                             href={`https://wa.me/${appointment.CustomerPhone.replace(/\D/g, '')}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="bg-app-accent hover:bg-app-accent-dark text-white p-2 rounded-lg transition-all shadow-sm flex items-center justify-center tap-target"
                             title="Chat on WhatsApp"
                           >
                             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                           </a>
                        )}
                        <button
                          onClick={() => setConfirmModal({
                            isOpen: true,
                            title: "Notify Customer",
                            message: `Send a "10-minute warning" notification${appointment.CustomerPhone ? ' and WhatsApp message' : ''} to ${appointment.CustomerName}?`,
                            action: () => dispatch(notifyCustomer(appointment.Id)),
                            btnText: "Notify",
                            btnColor: "bg-app-accent hover:bg-app-accent-dark"
                          })}
                          className="bg-app-surface-2 hover:bg-app-accent hover:text-white text-app-accent p-2 rounded-lg transition-all border border-app-border font-bold tap-target"
                          title="Notify (10 min warning)"
                        >
                          🔔
                        </button>
                      </>
                    )}

                    {appointment.Status === "PENDING" && (
                        <>
                          <button
                            onClick={() => setConfirmModal({
                              isOpen: true,
                              title: "Accept Appointment",
                              message: `Accept appointment for ${appointment.CustomerName} at ${date} ${time}?`,
                              action: () => dispatch(acceptAppointment(appointment.Id)),
                              btnText: "Accept",
                              btnColor: "bg-app-accent hover:bg-app-accent-dark"
                            })}
                            className="bg-app-surface-2 hover:bg-app-accent hover:text-white text-app-accent p-2 rounded-lg transition-all border border-app-border tap-target"
                            title="Accept"
                          >
                            ✅
                          </button>
                          <button
                            onClick={() => setDeclineModal({
                              isOpen: true,
                              appointmentId: appointment.Id,
                              reason: ""
                            })}
                            className="bg-app-surface-2 hover:bg-app-accent hover:text-white text-app-accent p-2 rounded-lg transition-all border border-app-border tap-target"
                            title="Decline"
                          >
                            🚫
                          </button>
                        </>
                    )}
                    {appointment.Status === "SCHEDULED" && (
                      <>
                        <button
                          onClick={() => setConfirmModal({
                            isOpen: true,
                            title: "Customer Arrived",
                            message: `Mark ${appointment.CustomerName} as arrived? This will add them to the queue and update the appointment as completed.`,
                            action: () => dispatch(arriveForAppointment(appointment.Id)),
                            btnText: "Arrived",
                            btnColor: "bg-app-accent hover:bg-app-accent-dark"
                          })}
                          className="bg-app-surface-2 hover:bg-app-accent hover:text-white text-app-accent p-2 rounded-lg transition-all border border-app-border tap-target"
                          title="Customer Arrived"
                        >
                          🏃
                        </button>
                        <button
                          onClick={() => setConfirmModal({
                            isOpen: true,
                            title: "Complete Appointment",
                            message: `Are you sure you want to mark ${appointment.CustomerName}'s appointment as completed?`,
                            action: () => dispatch(completeAppointment(appointment.Id)),
                            btnText: "Complete",
                            btnColor: "bg-app-accent hover:bg-app-accent-dark"
                          })}
                          className="bg-app-surface-2 hover:bg-app-accent hover:text-white text-app-accent p-2 rounded-lg transition-all border border-app-border tap-target"
                          title="Complete"
                        >
                          ✅
                        </button>
                        <button
                          onClick={() => setConfirmModal({
                            isOpen: true,
                            title: "Mark No Show",
                            message: `Are you sure you want to mark ${appointment.CustomerName} as a no-show? This will increment their no-show count.`,
                            action: () => dispatch(markNoShow(appointment.Id)),
                            btnText: "Mark No-Show",
                            btnColor: "bg-app-accent hover:bg-app-accent-dark"
                          })}
                          className="bg-app-surface-2 hover:bg-app-accent hover:text-white text-app-accent p-2 rounded-lg transition-all border border-app-border tap-target"
                          title="No Show"
                        >
                          ⚠️
                        </button>
                        <button
                          onClick={() => setConfirmModal({
                            isOpen: true,
                            title: "Cancel Appointment",
                            message: `Are you sure you want to cancel the appointment for ${appointment.CustomerName}?`,
                            action: () => dispatch(cancelAppointment(appointment.Id)),
                            btnText: "Cancel",
                            btnColor: "bg-app-accent hover:bg-app-accent-dark"
                          })}
                          className="bg-app-surface-2 hover:bg-app-accent hover:text-white text-app-accent p-2 rounded-lg transition-all border border-app-border tap-target"
                          title="Cancel"
                        >
                          ❌
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

      {/* Customer Detail Modal */}
      <CustomerModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          dispatch(clearSelectedCustomer());
        }} 
      />

      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        title={confirmModal.title}
      >
        <div className="p-6 text-center">
            <p className="text-app-muted mb-8">{confirmModal.message}</p>
            <div className="flex gap-3">
                <button 
                    onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                    className="flex-1 px-6 py-3 bg-app-surface-2 hover:bg-app-surface text-app-text font-bold rounded-[12px] transition"
                >
                    Back
                </button>
                <button 
                    onClick={() => {
                        confirmModal.action();
                        setConfirmModal({ ...confirmModal, isOpen: false });
                    }}
                    className={`flex-1 px-6 py-3 text-white font-bold rounded-xl transition shadow-lg ${confirmModal.btnColor}`}
                >
                    {confirmModal.btnText}
                </button>
            </div>
        </div>
      </Modal>

      <Modal
        isOpen={declineModal.isOpen}
        onClose={() => setDeclineModal({ ...declineModal, isOpen: false })}
        title="Decline Appointment"
      >
         <div className="p-6">
            <p className="text-app-muted mb-4">Please provide a reason for declining this appointment:</p>
            <textarea
                className="w-full border rounded-xl p-4 focus:ring-2 focus:ring-red-500 outline-none mb-6"
                rows="3"
                placeholder="Reason (e.g. Barber unavailable, conflict...)"
                value={declineModal.reason}
                onChange={(e) => setDeclineModal({ ...declineModal, reason: e.target.value })}
            />
            <div className="flex gap-3">
                <button 
                    onClick={() => setDeclineModal({ ...declineModal, isOpen: false })}
                    className="flex-1 px-6 py-3 bg-app-surface-2 hover:bg-app-surface text-app-text font-bold rounded-[12px] transition"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => {
                        if (!declineModal.reason.trim()) return;
                        dispatch(declineAppointment({ id: declineModal.appointmentId, reason: declineModal.reason }));
                        setDeclineModal({ ...declineModal, isOpen: false });
                    }}
                    disabled={!declineModal.reason.trim()}
                    className={`flex-1 px-6 py-3 text-white font-bold rounded-[12px] transition shadow-lg bg-app-accent hover:bg-app-accent-dark ${!declineModal.reason.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    Decline Request
                </button>
            </div>
         </div>
      </Modal>
    </div>
  );
}
