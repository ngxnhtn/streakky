import { useEffect, useMemo } from "react";
import { widgetSummary } from "@streakky/core";
import type { Platform } from "../platform.ts";
import { useArchivedHabits, useHabits, useSettings } from "../store/react.tsx";
import { widgetLook } from "../widget-look.ts";

/**
 * Keeps the home-screen widgets in step with the habits and the app's look: a moment after any
 * change to either, and as the app opens, writes every active and archived habit's summary (core's
 * `widgetSummary`), which the widgets count from until the next change, the palette's colours and
 * the theme they're drawn in, and the time zone days follow. A habit left out was deleted. Renders
 * nothing.
 */
export function WidgetSummaries({ widgets }: { widgets: NonNullable<Platform["widgets"]> }) {
  const habits = useHabits();
  const archived = useArchivedHabits();
  const { palette, theme, timeZone } = useSettings();
  const summaries = useMemo(
    () => [...habits, ...archived].map((habit) => widgetSummary(habit)),
    [habits, archived],
  );
  useEffect(() => {
    // a moment later, so a burst of check-ins writes once
    const timer = window.setTimeout(() => {
      let look;
      try {
        look = widgetLook({ palette, theme });
      } catch (error) {
        // the counts matter more: they're written still, and the widgets keep their last colours
        console.error("The widgets' colours couldn't be measured:", error);
      }
      widgets.update({ summaries, look, timeZone }).catch((error: unknown) => {
        console.error("The widgets couldn't be updated:", error);
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [widgets, summaries, palette, theme, timeZone]);
  return null;
}
