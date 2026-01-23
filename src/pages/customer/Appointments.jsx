import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchCustomerAppointments,
  cancelAppointment
} from "../../features/appointments/appointmentsSlice";
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

export default function Appointments() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, loading, error } = useAppSelector(s => s.appointments);
  const [filter, setFilter] = useState("SCHEDULED");
  
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedBarberId, setSelectedBarberId] = useState(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [rescheduleErrorModalOpen, setRescheduleErrorModalOpen] = useState(false);
  const [actionError, setActionError] = useState(null);

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
      NO_SHOW: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "⚠️" }
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
    } catch (err) {
        setActionError(err);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">📅 My Appointments</h1>
        <p className="text-gray-600">View, manage, and reschedule your bookings</p>
      </div>

      {/* Stats Cards / Filters */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-10">
          <button 
            onClick={() => setFilter("TOTAL")}
            className={`transition-all duration-200 rounded-2xl border-2 p-6 text-left ${filter === "TOTAL" ? "bg-blue-600 border-blue-600 text-white shadow-lg scale-105" : "bg-white border-blue-100 text-gray-700 hover:border-blue-300 shadow-sm"}`}
          >
            <p className={`text-sm font-semibold ${filter === "TOTAL" ? "text-blue-100" : "text-gray-500"}`}>Total</p>
            <p className="text-4xl font-bold mt-2">{items.length}</p>
          </button>
          
          <button 
            onClick={() => setFilter("SCHEDULED")}
            className={`transition-all duration-200 rounded-2xl border-2 p-6 text-left ${filter === "SCHEDULED" ? "bg-blue-500 border-blue-500 text-white shadow-lg scale-105" : "bg-white border-blue-100 text-gray-700 hover:border-blue-300 shadow-sm"}`}
          >
            <p className={`text-sm font-semibold ${filter === "SCHEDULED" ? "text-blue-100" : "text-gray-500"}`}>Scheduled</p>
            <p className="text-4xl font-bold mt-2">{items.filter(a => a.Status === 'SCHEDULED').length}</p>
          </button>

          <button 
            onClick={() => setFilter("PENDING")}
            className={`transition-all duration-200 rounded-2xl border-2 p-6 text-left ${filter === "PENDING" ? "bg-indigo-600 border-indigo-600 text-white shadow-lg scale-105" : "bg-white border-indigo-100 text-gray-700 hover:border-indigo-300 shadow-sm"}`}
          >
            <p className={`text-sm font-semibold ${filter === "PENDING" ? "text-indigo-100" : "text-gray-500"}`}>Pending</p>
            <p className="text-4xl font-bold mt-2">{items.filter(a => a.Status === 'PENDING').length}</p>
          </button>

          <button 
            onClick={() => setFilter("COMPLETED")}
            className={`transition-all duration-200 rounded-2xl border-2 p-6 text-left ${filter === "COMPLETED" ? "bg-green-600 border-green-600 text-white shadow-lg scale-105" : "bg-white border-green-100 text-gray-700 hover:border-green-300 shadow-sm"}`}
          >
            <p className={`text-sm font-semibold ${filter === "COMPLETED" ? "text-green-100" : "text-gray-500"}`}>Completed</p>
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
            onClick={() => setFilter("DECLINED")}
            className={`transition-all duration-200 rounded-2xl border-2 p-6 text-left ${filter === "DECLINED" ? "bg-gray-600 border-gray-600 text-white shadow-lg scale-105" : "bg-white border-gray-100 text-gray-700 hover:border-gray-300 shadow-sm"}`}
          >
            <p className={`text-sm font-semibold ${filter === "DECLINED" ? "text-gray-100" : "text-gray-500"}`}>Declined</p>
            <p className="text-4xl font-bold mt-2">{items.filter(a => a.Status === 'DECLINED').length}</p>
          </button>

          <button 
            onClick={() => setFilter("NO_SHOW")}
            className={`transition-all duration-200 rounded-2xl border-2 p-6 text-left ${filter === "NO_SHOW" ? "bg-amber-600 border-amber-600 text-white shadow-lg scale-105" : "bg-white border-amber-100 text-gray-700 hover:border-amber-300 shadow-sm"}`}
          >
            <p className={`text-sm font-semibold ${filter === "NO_SHOW" ? "text-amber-100" : "text-gray-500"}`}>No Show</p>
            <p className="text-4xl font-bold mt-2">{items.filter(a => a.Status === 'NO_SHOW').length}</p>
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-8 flex items-center justify-between">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 text-lg mt-4">Loading your appointments...</p>
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

      {/* Appointments List */}
      {!loading && filteredItems.length > 0 && (
        <div className="space-y-4">
          {filteredItems.map(appointment => {
            const { date, time } = formatDate(appointment.StartTime);
            const statusBadge = getStatusBadge(appointment.Status);

            return (
              <div
                key={appointment.Id}
                className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-2xl hover:scale-[1.01] hover:z-10 transition-all duration-300 cursor-default overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300" />
                
                <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-6">
                  {/* Time Column */}
                  <div className="min-w-[140px]">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Time</p>
                    <p className="text-sm font-bold text-gray-900">{date}</p>
                    <p className="text-indigo-600 font-black text-lg">⏰ {time}</p>
                  </div>

                  {/* Details Column */}
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
                       Services at <button onClick={() => openProfile(appointment.BarberId)} className="hover:underline hover:text-indigo-600 font-bold text-gray-500 uppercase">{appointment.BarberName}</button>
                    </p>
                    <p className="text-lg font-bold text-gray-900">{appointment.Services}</p>
                    {appointment.Status === "DECLINED" && appointment.DeclineReason && (
                        <p className="mt-2 text-sm text-red-600 font-medium italic border-l-2 border-red-200 pl-3">
                            <span className="font-bold uppercase text-[10px] block not-italic mb-0.5">Reason for decline:</span>
                            "{appointment.DeclineReason}"
                        </p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center">
                    <div className={`px-4 py-1.5 rounded-full font-bold text-xs flex items-center gap-2 ${statusBadge.bg} border ${statusBadge.border} ${statusBadge.text}`}>
                      <span className="text-sm">{statusBadge.icon}</span> {appointment.Status}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {appointment.Status === "COMPLETED" && (
                        <button
                            onClick={() => openRateModal(appointment)}
                            className="bg-yellow-50 hover:bg-yellow-600 hover:text-white text-yellow-600 px-4 py-2 rounded-lg font-bold text-xs transition-all border border-yellow-100 uppercase"
                        >
                            Rate ★
                        </button>
                    )}
                    {(appointment.Status === "SCHEDULED" || appointment.Status === "PENDING") && (
                      <>
                        <button
                          onClick={() => handleReschedule(appointment)}
                          className="bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 px-4 py-2 rounded-lg font-bold text-xs transition-all border border-indigo-100 uppercase"
                        >
                          Reschedule
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAppointmentId(appointment.Id);
                            setCancelModalOpen(true);
                            setActionError(null);
                          }}
                          className="bg-red-50 hover:bg-red-600 hover:text-white text-red-600 px-4 py-2 rounded-lg font-bold text-xs transition-all border border-red-100 uppercase"
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
        onSuccess={() => {/* Toast or something? */}}
      />
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
