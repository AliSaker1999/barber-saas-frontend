import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { toHHMM as parseHHMM } from "../../utils/time";
import {
  fetchWorkingHours,
  saveWorkingHours
} from "../../features/workingHours/workingHoursSlice";

// Falls back to the raw value unchanged (rather than "--" or null) to match
// this component's existing display behavior for an unparseable time.
const toHHMM = (value) => parseHHMM(value, value);

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
      start: toHHMM(h.StartTime),
      end: toHHMM(h.EndTime),
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
      <h3 className="font-semibold mb-3 text-app-text">Working Hours</h3>

      <div className="bg-app-surface border border-app-border rounded-[12px] overflow-hidden">
        {DAYS.map((dayName, dayIndex) => {
          const day = draft[dayIndex] || {};

          return (
            <div
              key={dayIndex}
              className="flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-4 items-start sm:items-center p-4 border-b last:border-b-0 hover:bg-app-surface-2 transition-colors"
            >
              {/* DAY NAME */}
                <div className="sm:col-span-3 font-bold text-app-text text-sm sm:text-base mb-1 sm:mb-0">
                {dayName}
              </div>

              {/* TIME INPUTS */}
              {day.active ? (
                <>
                  <div className="sm:col-span-6 flex items-center gap-2 w-full">
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
                        className="flex-1 border-2 border-app-border rounded-[12px] px-3 py-2 text-sm focus:border-app-accent focus:outline-none transition-all text-app-text"
                    />
                    <span className="text-app-muted font-bold">to</span>
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
                        className="flex-1 border-2 border-app-border rounded-[12px] px-3 py-2 text-sm focus:border-app-accent focus:outline-none transition-all text-app-text"
                    />
                  </div>

                  <button
                    onClick={() => saveDay(dayIndex)}
                    className="sm:col-span-3 w-full sm:w-auto px-6 py-2 text-sm font-black bg-app-accent text-white rounded-[12px] hover:bg-app-accent-dark shadow-lg transition-all hover:scale-105 active:scale-95"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <div className="sm:col-span-6 text-sm text-app-muted font-bold italic py-2">
                    Not working this day
                  </div>
                  <button
                    onClick={() =>
                      setDraft(prev => ({
                        ...prev,
                        [dayIndex]: { active: true }
                      }))
                    }
                    className="sm:col-span-3 w-full sm:w-auto px-6 py-2 text-sm font-bold border-2 border-dashed border-app-border text-app-muted rounded-[12px] hover:bg-app-surface hover:border-app-accent hover:text-app-accent transition-all"
                  >
                    Enable Day
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
