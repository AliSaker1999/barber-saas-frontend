import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchWorkingHours,
  saveWorkingHours
} from "../../features/workingHours/workingHoursSlice";

const DAYS = [
  "Sunday", "Monday", "Tuesday",
  "Wednesday", "Thursday", "Friday", "Saturday"
];

export default function BarberWorkingHours({ barber }) {
  const dispatch = useAppDispatch();
  const hours = useAppSelector(s => s.workingHours.items);

  /* Fetch when barber changes */
  useEffect(() => {
    dispatch(fetchWorkingHours(barber.Id));
  }, [barber.Id, dispatch]);

  /* Derive initial values (pure, no state) */
  const derived = useMemo(() => {
    const map = {};
    hours.forEach(h => {
      map[h.DayOfWeek] = {
        start: h.StartTime.substring(0, 5),
        end: h.EndTime.substring(0, 5)
      };
    });
    return map;
  }, [hours]);

  /* ✅ Initialize editable state ONCE per barber */
  const [draft, setDraft] = useState(() => derived);

  /* 🔑 Reset state when barber changes (NO EFFECT!) */
  const barberKey = barber.Id;

  const saveDay = (day) => {
    const data = draft[day];
    if (!data?.start || !data?.end) return;

    dispatch(saveWorkingHours({
      barberId: barber.Id,
      dayOfWeek: day,
      startTime: data.start,
      endTime: data.end
    }));
  };

  return (
    <div key={barberKey}>
      <h4>Working Hours</h4>

      {DAYS.map((d, i) => (
        <div key={i}>
          <strong>{d}</strong>{" "}
          <input
            type="time"
            value={draft[i]?.start || ""}
            onChange={e =>
              setDraft(prev => ({
                ...prev,
                [i]: { ...prev[i], start: e.target.value }
              }))
            }
          />
          <input
            type="time"
            value={draft[i]?.end || ""}
            onChange={e =>
              setDraft(prev => ({
                ...prev,
                [i]: { ...prev[i], end: e.target.value }
              }))
            }
          />
          <button onClick={() => saveDay(i)}>Save</button>
        </div>
      ))}
    </div>
  );
}
