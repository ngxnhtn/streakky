import { useEffect, useState } from "react";
import { todayISO, tomorrowStarts } from "@streakky/core";
import { useSettings } from "../store/react.tsx";

/**
 * Today in the time zone days follow (YYYY-MM-DD). The screen re-renders at that zone's midnight,
 * when the app comes back to the foreground on a later day, and when the zone changes, so counts
 * grow while the app stays open.
 */
export function useToday(): string {
  const { timeZone } = useSettings();
  const [today, setToday] = useState(() => ({ day: todayISO(), timeZone }));
  useEffect(() => {
    let timer = 0;
    const refresh = () => {
      setToday({ day: todayISO(), timeZone });
      window.clearTimeout(timer);
      // a moment after midnight, so the clock has surely moved on to the new day
      timer = window.setTimeout(refresh, tomorrowStarts().getTime() - Date.now() + 1000);
    };
    refresh();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [timeZone]);
  // just after the zone changes, before the effect has caught up, the new zone's day already
  return today.timeZone === timeZone ? today.day : todayISO();
}
