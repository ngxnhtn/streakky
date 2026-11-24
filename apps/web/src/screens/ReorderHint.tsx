import { useState } from "react";
import { Note } from "@streakky/ui/components/note";
import { useMediaQuery } from "@streakky/ui/hooks/use-media-query";
import { cn } from "@streakky/ui/lib/utils";
import { useHabitStore, useHabits, useSettings } from "../store/react.tsx";

/** Whether the device's main pointer is a finger, so the hint talks of touch, not a mouse. */
const TOUCH_FIRST = "(pointer: coarse)";

/**
 * Home's one-time hint that habits can be dragged into the person's own order, worded for a finger
 * or a mouse. It shows while there are two habits or more, and goes for good on this device once
 * dismissed or after the first reorder (the store sees to that). It folds away rather than
 * jolting the habits up at once.
 */
export function ReorderHint() {
  const store = useHabitStore();
  const { reorderHintDismissed } = useSettings();
  const enough = useHabits().length >= 2;
  const touch = useMediaQuery(TOUCH_FIRST);
  // dismissed before Home opened: there's nothing to fold away
  const [wasDue] = useState(!reorderHintDismissed);
  if (!wasDue) return null;
  const shown = enough && !reorderHintDismissed;
  return (
    <div
      data-slot="reorder-hint"
      inert={!shown}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-200 ease-ui",
        shown ? "grid-rows-[1fr]" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="px-5 pb-5">
          <Note
            dismissLabel="Dismiss the hint"
            onDismiss={() => store.changeSettings({ reorderHintDismissed: true })}
          >
            {touch
              ? "Touch and hold a habit, then drag it into your own order."
              : "Drag a habit into your own order, or move it with Alt and ↑ or ↓."}
          </Note>
        </div>
      </div>
    </div>
  );
}
