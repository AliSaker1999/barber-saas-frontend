import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchSlots,
  bookAppointment
} from "../../features/booking/bookingSlice";

export default function Slots() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    tenantId,
    selectedServiceIds,
    selectedBarberId,
    slots,
    loading
  } = useAppSelector(state => state.booking);

  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [error, setError] = useState(null);

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

    if (!selectedBarberId) {
      navigate("/customer/barbers");
      return;
    }

    dispatch(fetchSlots({
      tenantId,
      barberId: selectedBarberId,
      serviceIds: selectedServiceIds,
      date
    }));
  }, [
    tenantId,
    selectedServiceIds,
    selectedBarberId,
    date,
    dispatch,
    navigate
  ]);

  const handleBook = async (time) => {
    setError(null);

    try {
      await dispatch(
        bookAppointment({
          tenantId,
          barberId: selectedBarberId,
          serviceIds: selectedServiceIds,
          startTime: `${date}T${time}:00`
        })
      ).unwrap();

      alert("Appointment booked successfully!");
      navigate("/customer");
    } catch (err) {
      if (err?.response?.status === 409) {
        setError("Selected time is no longer available.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <div>
      <h2>Select a Time</h2>

      <label>
        Date:{" "}
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </label>

      {loading && <p>Loading available slots...</p>}

      {!loading && slots.length === 0 && (
        <p>No available slots for this date.</p>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {slots.map(time => (
          <button
            key={time}
            onClick={() => handleBook(time)}
          >
            {time}
          </button>
        ))}
      </div>
    </div>
  );
}
