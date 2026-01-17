import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchBarbersByService,
  selectBarber
} from "../../features/booking/bookingSlice";

export default function Barbers() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    tenantId,
    selectedServiceIds,
    barbers,
    selectedBarberId,
    loading
  } = useAppSelector(state => state.booking);

  /* 🚨 Guards */
  useEffect(() => {
    if (!tenantId) {
      navigate("/customer");
      return;
    }

    if (!selectedServiceIds.length) {
      navigate("/customer/services");
      return;
    }

    dispatch(fetchBarbersByService(selectedServiceIds[0]));
  }, [tenantId, selectedServiceIds, dispatch, navigate]);

  if (loading) return <p>Loading barbers...</p>;

  return (
    <div>
      <h2>Select a Barber</h2>

      {barbers.length === 0 && (
        <p>No barbers available for the selected service.</p>
      )}

      <ul>
        {barbers.map(barber => (
          <li key={barber.BarberId}>
            <button
              style={{
                fontWeight:
                  selectedBarberId === barber.BarberId ? "bold" : "normal"
              }}
              onClick={() => {
                dispatch(selectBarber(barber.BarberId));
                navigate("/customer/slots");
              }}
            >
              {barber.FullName}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
