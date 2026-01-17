import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchServices,
  toggleService
} from "../../features/booking/bookingSlice";

export default function Services() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    tenantId,
    services,
    selectedServiceIds,
    loading
  } = useAppSelector(state => state.booking);

  /* 🚨 Guard: user refreshed or skipped tenant */
  useEffect(() => {
    if (!tenantId) {
      navigate("/customer");
      return;
    }

    dispatch(fetchServices(tenantId));
  }, [tenantId, dispatch, navigate]);

  if (loading) return <p>Loading services...</p>;

  return (
    <div>
      <h2>Select Services</h2>

      {services.length === 0 && (
        <p>No services available for this barbershop.</p>
      )}

      <ul>
        {services.map(service => (
          <li key={service.Id}>
            <label>
              <input
                type="checkbox"
                checked={selectedServiceIds.includes(service.Id)}
                onChange={() => dispatch(toggleService(service.Id))}
              />
              <strong>{service.Name}</strong>{" "}
              ({service.DurationMinutes} min)
            </label>
          </li>
        ))}
      </ul>

      <button
        disabled={selectedServiceIds.length === 0}
        onClick={() => navigate("/customer/barbers")}
      >
        Next
      </button>
    </div>
  );
}
