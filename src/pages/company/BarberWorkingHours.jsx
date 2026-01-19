import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchWorkingHours,
  saveWorkingHours
} from "../../features/workingHours/workingHoursSlice";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

export default function BarberWorkingHours({ barber }) {
  const dispatch = useAppDispatch();
  const hours = useAppSelector(s => s.workingHours.items);

  /* Fetch when barber changes */
  useEffect(() => {
    dispatch(fetchWorkingHours(barber.Id));
  }, [barber.Id, dispatch]);

  /* Normalize DB → UI */
const initial = useMemo(() => {
  const map = {};
  hours.forEach(h => {
    map[h.DayOfWeek] = {
      start: h.StartTime.slice(0, 5),
      end: h.EndTime.slice(0, 5),
      active: true
    };
  });
  return map;
}, [hours]);

const [draft, setDraft] = useState({});

/* 🔥 THIS WAS MISSING */
useEffect(() => {
  setDraft(initial);
}, [initial]);


  const saveDay = async (day) => {
  const d = draft[day];
  if (!d?.start || !d?.end) return;

  await dispatch(saveWorkingHours({
    barberId: barber.Id,
    dayOfWeek: day,
    startTime: d.start,
    endTime: d.end
  }));

  dispatch(fetchWorkingHours(barber.Id));
};


  return (
    <div className="mt-6">
      <h3 className="font-semibold mb-3">
        Working Hours
      </h3>

      <div className="bg-gray-50 border rounded overflow-hidden">
        {DAYS.map((dayName, dayIndex) => {
          const day = draft[dayIndex] || {};

          return (
            <div
              key={dayIndex}
              className="grid grid-cols-12 gap-2 items-center p-3 border-b last:border-b-0"
            >
              {/* DAY NAME */}
              <div className="col-span-3 font-medium text-sm">
                {dayName}
              </div>

              {/* TIME INPUTS */}
              {day.active ? (
                <>
                  <input
                    type="time"
                    value={day.start || ""}
                    onChange={e =>
                      setDraft(prev => ({
                        ...prev,
                        [dayIndex]: {
                          ...prev[dayIndex],
                          start: e.target.value,
                          active: true
                        }
                      }))
                    }
                    className="col-span-3 border rounded px-2 py-1 text-sm"
                  />

                  <input
                    type="time"
                    value={day.end || ""}
                    onChange={e =>
                      setDraft(prev => ({
                        ...prev,
                        [dayIndex]: {
                          ...prev[dayIndex],
                          end: e.target.value,
                          active: true
                        }
                      }))
                    }
                    className="col-span-3 border rounded px-2 py-1 text-sm"
                  />

                  <button
                    onClick={() => saveDay(dayIndex)}
                    className="col-span-3 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                </>
              ) : (
                <>
                  <div className="col-span-6 text-sm text-gray-500">
                    Off
                  </div>
                  <button
                    onClick={() =>
                      setDraft(prev => ({
                        ...prev,
                        [dayIndex]: { active: true }
                      }))
                    }
                    className="col-span-3 px-3 py-1 text-sm border rounded hover:bg-gray-100"
                  >
                    Enable
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
