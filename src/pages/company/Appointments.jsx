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
  const { items, loading } = useAppSelector(state => state.appointments);

  useEffect(() => {
    dispatch(fetchAppointments());

    const socket = getSocket();
    if (socket) {
      socket.on("appointments:update", () => {
        dispatch(fetchAppointments());
      });
    }

    return () => {
      if (socket) socket.off("appointments:update");
    };
  }, [dispatch]);

  return (
    <div>
      <h2>Appointments</h2>

      {loading && <p>Loading...</p>}

      {items.length === 0 && <p>No appointments.</p>}

      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Time</th>
            <th>Customer</th>
            <th>Barber</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {items.map(a => (
            <tr key={a.Id}>
              <td>
                {new Date(a.StartTime).toLocaleTimeString()}
              </td>
              <td>{a.CustomerName}</td>
              <td>{a.BarberName}</td>
              <td>{a.Status}</td>
              <td>
                {a.Status === "SCHEDULED" && (
                  <>
                    <button
                      onClick={() => dispatch(cancelAppointment(a.Id))}
                    >
                      Cancel
                    </button>

                    <button
                      onClick={() => dispatch(markNoShow(a.Id))}
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
  );
}
