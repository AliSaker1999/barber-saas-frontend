import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchTenants } from "../../features/tenants/tenantsSlice";
import { selectTenant } from "../../features/booking/bookingSlice";
import { joinQueue } from "../../features/queue/queueSlice";

export default function Tenants() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { tenants, loading } = useAppSelector(state => state.tenants);

  useEffect(() => {
    dispatch(fetchTenants());
  }, [dispatch]);

  if (loading) return <p>Loading barbershops...</p>;

  return (
    <div>
      <h2>Choose a Barbershop</h2>

      <ul>
        {tenants.map(t => (
          <li key={t.Id}>
            <strong>{t.Name}</strong>

            <div style={{ marginTop: 6 }}>
              {/* ✅ BOOK APPOINTMENT FLOW */}
              <button
                onClick={() => {
                  dispatch(selectTenant(t.Id));
                  navigate("/customer/services");
                }}
              >
                Book Appointment
              </button>

              {/* ✅ JOIN QUEUE FLOW */}
              <button
                style={{ marginLeft: 8 }}
                onClick={async () => {
                    try {
                        await dispatch(joinQueue(t.Id)).unwrap();
                        navigate("/customer/queue");
                    } catch (err) {
                        alert(err.message || "Cannot join queue");
                    }
                    }}
              >
                Join Queue
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
