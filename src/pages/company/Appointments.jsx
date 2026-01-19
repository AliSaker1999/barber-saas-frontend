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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        Appointments
      </h1>

      {loading && <p>Loading...</p>}
      {!loading && items.length === 0 && (
        <p className="text-gray-500">No appointments.</p>
      )}

      {items.length > 0 && (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Time</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Barber</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {items.map(a => (
                <tr key={a.Id} className="border-t">
                  <td className="p-3">
                    {new Date(a.StartTime).toLocaleTimeString()}
                  </td>
                  <td className="p-3">{a.CustomerName}</td>
                  <td className="p-3">{a.BarberName}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                      {a.Status}
                    </span>
                  </td>
                  <td className="p-3 space-x-2">
                    {a.Status === "SCHEDULED" && (
                      <>
                        <button
                          onClick={() => dispatch(cancelAppointment(a.Id))}
                          className="px-2 py-1 text-xs rounded bg-red-600 text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => dispatch(markNoShow(a.Id))}
                          className="px-2 py-1 text-xs rounded border"
                        >
                          No-show
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
