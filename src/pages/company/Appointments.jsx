import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchAppointments,
  cancelAppointment,
  markNoShow
} from "../../features/appointments/appointmentsSlice";
import { getSocket } from "../../services/socket";

export default function Appointments() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector(s => s.appointments);

  useEffect(() => {
    dispatch(fetchAppointments());

    const socket = getSocket();
    if (socket) {
      socket.on("appointments:update", () => {
        dispatch(fetchAppointments());
      });
    }

    return () => socket?.off("appointments:update");
  }, [dispatch]);

  const getStatusBadge = (status) => {
    const badges = {
      SCHEDULED: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "📅" },
      COMPLETED: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", icon: "✅" },
      CANCELLED: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: "❌" },
      NO_SHOW: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", icon: "⚠️" }
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

      {/* Stats Cards */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 p-6">
            <p className="text-sm font-semibold text-gray-700">Total</p>
            <p className="text-4xl font-bold text-blue-600 mt-2">{items.length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border-2 border-green-200 p-6">
            <p className="text-sm font-semibold text-gray-700">Scheduled</p>
            <p className="text-4xl font-bold text-green-600 mt-2">{items.filter(a => a.Status === 'SCHEDULED').length}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border-2 border-emerald-200 p-6">
            <p className="text-sm font-semibold text-gray-700">Completed</p>
            <p className="text-4xl font-bold text-emerald-600 mt-2">{items.filter(a => a.Status === 'COMPLETED').length}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border-2 border-red-200 p-6">
            <p className="text-sm font-semibold text-gray-700">Cancelled</p>
            <p className="text-4xl font-bold text-red-600 mt-2">{items.filter(a => a.Status === 'CANCELLED' || a.Status === 'NO_SHOW').length}</p>
          </div>
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
      {!loading && items.length === 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 text-lg font-semibold">No appointments scheduled</p>
          <p className="text-gray-400 mt-2">Appointments will appear here when customers book</p>
        </div>
      )}

      {/* Appointments Grid */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {items.map(appointment => {
            const { date, time } = formatDate(appointment.StartTime);
            const statusBadge = getStatusBadge(appointment.Status);

            return (
              <div
                key={appointment.Id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border-l-4 border-indigo-600"
              >
                <div className="p-6">
                  {/* Status Badge */}
                  <div className={`inline-block px-4 py-2 rounded-full font-semibold text-sm mb-4 ${statusBadge.bg} border-2 ${statusBadge.border} ${statusBadge.text}`}>
                    {statusBadge.icon} {appointment.Status}
                  </div>

                  {/* Date & Time */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <p className="text-sm text-gray-600 font-semibold">Schedule</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{date}</p>
                    <p className="text-indigo-600 font-bold text-xl mt-1">⏰ {time}</p>
                  </div>

                  {/* Customer Info */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <p className="text-sm text-gray-600 font-semibold">Customer</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{appointment.CustomerName}</p>
                  </div>

                  {/* Barber Info */}
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 font-semibold">Barber</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{appointment.BarberName}</p>
                  </div>

                  {/* Actions */}
                  {appointment.Status === "SCHEDULED" && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          if (window.confirm("Mark this appointment as no-show?")) {
                            dispatch(markNoShow(appointment.Id));
                          }
                        }}
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                      >
                        No Show
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm("Cancel this appointment?")) {
                            dispatch(cancelAppointment(appointment.Id));
                          }
                        }}
                        className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
