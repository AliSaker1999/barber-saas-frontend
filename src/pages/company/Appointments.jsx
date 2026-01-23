import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchAppointments,
  cancelAppointment,
  markNoShow,
  completeAppointment,
  acceptAppointment,
  declineAppointment,
  arriveForAppointment,
  clearAppointmentsError
} from "../../features/appointments/appointmentsSlice";
import { fetchCustomerDetails, clearSelectedCustomer } from "../../features/customers/customersSlice";
import { getSocket } from "../../services/socket";
import CustomerModal from "../../components/CustomerModal";
import Modal from "../../components/Modal";

export default function Appointments() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector(s => s.appointments);
  const [filter, setFilter] = useState("SCHEDULED");
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

  useEffect(() => {
    dispatch(fetchAppointments());

    const socket = getSocket();
    if (socket && tenantId) {
      socket.emit("join-tenant", tenantId);
      socket.on("appointments:update", () => {
        dispatch(fetchAppointments());
      });
    }

    return () => {
        if (socket) {
            socket.off("appointments:update");
        }
    };
  }, [dispatch, tenantId]);

  const filteredItems = filter === "TOTAL" 
    ? items 
    : items.filter(a => a.Status === filter);

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", icon: "⏳" },
      SCHEDULED: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "📅" },
      COMPLETED: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", icon: "✅" },
      CANCELLED: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: "❌" },
      DECLINED: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", icon: "🚫" },
      NO_SHOW: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "⚠️" }
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
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">📅 Appointments</h1>
        <p className="text-gray-600">Manage and track all salon appointments</p>
      </div>

      {/* Stats Cards / Filters */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          <button 
            onClick={() => setFilter("TOTAL")}
            className={`transition-all duration-200 rounded-2xl border-2 p-6 text-left ${filter === "TOTAL" ? "bg-blue-600 border-blue-600 text-white shadow-lg scale-105" : "bg-white border-blue-100 text-gray-700 hover:border-blue-300 shadow-sm"}`}
          >
            <p className={`text-sm font-semibold ${filter === "TOTAL" ? "text-blue-100" : "text-gray-500"}`}>Total</p>
            <p className="text-4xl font-bold mt-2">{items.length}</p>
          </button>

          <button 
            onClick={() => setFilter("PENDING")}
            className={`transition-all duration-200 rounded-2xl border-2 p-6 text-left ${filter === "PENDING" ? "bg-purple-600 border-purple-600 text-white shadow-lg scale-105" : "bg-white border-purple-100 text-gray-700 hover:border-purple-300 shadow-sm"}`}
          >
            <p className={`text-sm font-semibold ${filter === "PENDING" ? "text-purple-100" : "text-gray-500"}`}>Pending</p>
            <p className="text-4xl font-bold mt-2">{items.filter(a => a.Status === 'PENDING').length}</p>
          </button>
          
          <button 
            onClick={() => setFilter("SCHEDULED")}
            className={`transition-all duration-200 rounded-2xl border-2 p-6 text-left ${filter === "SCHEDULED" ? "bg-green-600 border-green-600 text-white shadow-lg scale-105" : "bg-white border-green-100 text-gray-700 hover:border-green-300 shadow-sm"}`}
          >
            <p className={`text-sm font-semibold ${filter === "SCHEDULED" ? "text-green-100" : "text-gray-500"}`}>Scheduled</p>
            <p className="text-4xl font-bold mt-2">{items.filter(a => a.Status === 'SCHEDULED').length}</p>
          </button>

          <button 
            onClick={() => setFilter("COMPLETED")}
            className={`transition-all duration-200 rounded-2xl border-2 p-6 text-left ${filter === "COMPLETED" ? "bg-emerald-600 border-emerald-600 text-white shadow-lg scale-105" : "bg-white border-emerald-100 text-gray-700 hover:border-emerald-300 shadow-sm"}`}
          >
            <p className={`text-sm font-semibold ${filter === "COMPLETED" ? "text-emerald-100" : "text-gray-500"}`}>Completed</p>
            <p className="text-4xl font-bold mt-2">{items.filter(a => a.Status === 'COMPLETED').length}</p>
          </button>

          <button 
            onClick={() => setFilter("CANCELLED")}
            className={`transition-all duration-200 rounded-2xl border-2 p-6 text-left ${filter === "CANCELLED" ? "bg-red-600 border-red-600 text-white shadow-lg scale-105" : "bg-white border-red-100 text-gray-700 hover:border-red-300 shadow-sm"}`}
          >
            <p className={`text-sm font-semibold ${filter === "CANCELLED" ? "text-red-100" : "text-gray-500"}`}>Cancelled</p>
            <p className="text-4xl font-bold mt-2">{items.filter(a => a.Status === 'CANCELLED').length}</p>
          </button>

          <button 
            onClick={() => setFilter("NO_SHOW")}
            className={`transition-all duration-200 rounded-2xl border-2 p-6 text-left ${filter === "NO_SHOW" ? "bg-amber-600 border-amber-600 text-white shadow-lg scale-105" : "bg-white border-amber-100 text-gray-700 hover:border-amber-300 shadow-sm"}`}
          >
            <p className={`text-sm font-semibold ${filter === "NO_SHOW" ? "text-amber-100" : "text-gray-500"}`}>No Show</p>
            <p className="text-4xl font-bold mt-2">{items.filter(a => a.Status === 'NO_SHOW').length}</p>
          </button>

          <button 
            onClick={() => setFilter("DECLINED")}
            className={`transition-all duration-200 rounded-2xl border-2 p-6 text-left ${filter === "DECLINED" ? "bg-gray-600 border-gray-600 text-white shadow-lg scale-105" : "bg-white border-gray-100 text-gray-700 hover:border-gray-300 shadow-sm"}`}
          >
            <p className={`text-sm font-semibold ${filter === "DECLINED" ? "text-gray-100" : "text-gray-500"}`}>Declined</p>
            <p className="text-4xl font-bold mt-2">{items.filter(a => a.Status === 'DECLINED').length}</p>
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-8 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button 
            onClick={() => dispatch(clearAppointmentsError())}
            className="text-red-500 hover:text-red-700 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 text-lg mt-4">Loading appointments...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredItems.length === 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-dashed border-gray-200">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 text-lg font-semibold">No {filter.toLowerCase()} appointments</p>
        </div>
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
                className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-2xl hover:scale-[1.02] hover:z-10 transition-all duration-300 cursor-default overflow-hidden"
              >
                {/* Decoration for hover */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300" />
                
                <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-6">
                  {/* Date & Time Column */}
                  <div className="min-w-[140px]">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Schedule</p>
                    <p className="text-sm font-bold text-gray-900">{date}</p>
                    <p className="text-indigo-600 font-black text-lg">⏰ {time}</p>
                  </div>

                  {/* Customer Column */}
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Customer</p>
                    <button 
                      onClick={() => handleOpenCustomer(appointment.CustomerId)}
                      className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors pointer-events-auto text-left block"
                    >
                      {appointment.CustomerName}
                    </button>
                    <p className="text-sm text-gray-600 truncate max-w-xs">{appointment.Services}</p>
                  </div>

                  {/* Barber Column */}
                  <div className="hidden lg:block min-w-[150px]">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Barber</p>
                    <p className="text-sm font-bold text-gray-900">{appointment.BarberName}</p>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center">
                    <div className={`px-4 py-1.5 rounded-full font-bold text-xs flex items-center gap-2 ${statusBadge.bg} border ${statusBadge.border} ${statusBadge.text}`}>
                      <span className="text-sm">{statusBadge.icon}</span> {appointment.Status}
                    </div>
                  </div>

                  {/* Actions (Only visible/expanded on hover or always if Scheduled) */}
                  <div className="flex gap-2">
                    {appointment.Status === "PENDING" && (
                        <>
                          <button
                            onClick={() => setConfirmModal({
                              isOpen: true,
                              title: "Accept Appointment",
                              message: `Accept appointment for ${appointment.CustomerName} at ${date} ${time}?`,
                              action: () => dispatch(acceptAppointment(appointment.Id)),
                              btnText: "Accept",
                              btnColor: "bg-green-600 hover:bg-green-700"
                            })}
                            className="bg-green-50 hover:bg-green-600 hover:text-white text-green-600 p-2 rounded-lg transition-all border border-green-100"
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
                            className="bg-red-50 hover:bg-red-600 hover:text-white text-red-600 p-2 rounded-lg transition-all border border-red-100"
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
                            btnColor: "bg-indigo-600 hover:bg-indigo-700"
                          })}
                          className="bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 p-2 rounded-lg transition-all border border-indigo-100"
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
                            btnColor: "bg-green-600 hover:bg-green-700"
                          })}
                          className="bg-green-50 hover:bg-green-600 hover:text-white text-green-600 p-2 rounded-lg transition-all border border-green-100"
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
                            btnColor: "bg-amber-600 hover:bg-amber-700"
                          })}
                          className="bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-600 p-2 rounded-lg transition-all border border-amber-100"
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
                            btnColor: "bg-red-600 hover:bg-red-700"
                          })}
                          className="bg-red-50 hover:bg-red-600 hover:text-white text-red-600 p-2 rounded-lg transition-all border border-red-100"
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
            <p className="text-gray-600 mb-8">{confirmModal.message}</p>
            <div className="flex gap-3">
                <button 
                    onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
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
            <p className="text-gray-600 mb-4">Please provide a reason for declining this appointment:</p>
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
                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
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
                    className={`flex-1 px-6 py-3 text-white font-bold rounded-xl transition shadow-lg bg-red-600 hover:bg-red-700 ${!declineModal.reason.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    Decline Request
                </button>
            </div>
         </div>
      </Modal>
    </div>
  );
}
