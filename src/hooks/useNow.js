import { useEffect, useState } from "react";

/*
 * A clock you can depend on.
 *
 * Anything that compares against "now" during render — is this appointment
 * still upcoming, how long until it starts, is this slot in the past — needs
 * the current time as state, not a `Date.now()` call inside a memo. Otherwise
 * the value only changes when the component happens to re-render, so a
 * countdown sits at "in 5 min" indefinitely and a finished appointment stays
 * listed as the next one.
 *
 * `intervalMs` should match the precision actually displayed: 60000 for
 * minute-granularity countdowns, smaller only if seconds are on screen.
 */
export default function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
