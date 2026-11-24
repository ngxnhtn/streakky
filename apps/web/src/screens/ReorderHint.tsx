import { useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { Button } from "@streakky/ui/components/button";
import { cn } from "@streakky/ui/lib/utils";
import { useHabitStore, useHabits, useSettings } from "../store/react.tsx";

const TOUCH_FIRST = "(pointer: coarse)";

/** Whether the device's main pointer is a finger, so the hint talks of touch, not a mouse. */
function useTouchFirst(): boolean {
  return useSyncExternalStore(
    (changed) => {
      const query = window.matchMedia(TOUCH_FIRST);
      query.addEventListener("change", changed);
      return () => query.removeEventListener("change", changed);
    },
    () => window.matchMedia(TOUCH_FIRST).matches,
  );
}

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
  const touch = useTouchFirst();
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
          <div className="flex items-center gap-1 rounded-2xl bg-muted py-1 pr-1 text-[0.875rem] leading-snug">
            <p className="flex-1 py-2 pl-4 text-muted-foreground">
              {touch
                ? "Touch and hold a habit, then drag it into your own order."
                : "Drag a habit into your own order, or move it with Alt and ↑ or ↓."}
            </p>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Dismiss the hint"
              onClick={() => store.changeSettings({ reorderHintDismissed: true })}
            >
              <X strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
