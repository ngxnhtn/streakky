import { useEffect, useState } from "react";
import { addDays, today, todayISO } from "@streakky/core";

/**
 * Today on this device (YYYY-MM-DD). The screen re-renders at local midnight, and when the app
 * comes back to the foreground on a later day, so counts grow while the app stays open.
 */
export function useToday(): string {
  const [day, setDay] = useState(todayISO);
  useEffect(() => {
    let timer = 0;
    const refresh = () => {
      setDay(todayISO());
      window.clearTimeout(timer);
      // a moment after midnight, so the clock has surely moved on to the new day
      timer = window.setTimeout(refresh, addDays(today(), 1).getTime() - Date.now() + 1000);
    };
    refresh();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return day;
}
