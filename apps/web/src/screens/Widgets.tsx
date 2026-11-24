import { useEffect, useMemo } from "react";
import { widgetSummary } from "@streakky/core";
import type { Platform } from "../platform.ts";
import { useArchivedHabits, useHabits } from "../store/react.tsx";

/**
 * Keeps the home-screen widgets in step with the habits: a moment after any change, and as the
 * app opens, writes every active and archived habit's summary (core's `widgetSummary`), which
 * the widgets count from until the next change. A habit left out was deleted. Renders nothing.
 */
export function WidgetSummaries({ widgets }: { widgets: NonNullable<Platform["widgets"]> }) {
  const habits = useHabits();
  const archived = useArchivedHabits();
  const summaries = useMemo(
    () => [...habits, ...archived].map((habit) => widgetSummary(habit)),
    [habits, archived],
  );
  useEffect(() => {
    // a moment later, so a burst of check-ins writes once
    const timer = window.setTimeout(() => {
      widgets.update(summaries).catch((error: unknown) => {
        console.error("The widgets couldn't be updated:", error);
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [widgets, summaries]);
  return null;
}
