import { useRef, useState, type ReactNode } from "react";
import { currentStreakDays, loggedToday, type Habit } from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import {
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@streakky/ui/components/dialog";
import { useHabitStore } from "../store/react.tsx";
import { useBackCloses, useCloseWhenCovered } from "./stack.tsx";

/**
 * Today's slip on a quit habit: removing it takes one tap, but logging one asks first, since it
 * ends the current streak. The screen renders `dialog` once; it closes when the screen is left.
 */
export function useTodaysSlip(): { toggleSlip: (habit: Habit) => void; dialog: ReactNode } {
  const store = useHabitStore();
  // the quit habit whose slip we're asking about, as it was when asked, kept while the sheet leaves
  const [slipping, setSlipping] = useState<{ habit: Habit; open: boolean } | null>(null);
  const close = () => setSlipping((s) => s && { ...s, open: false });
  useCloseWhenCovered(slipping?.open ?? false, close);
  return {
    toggleSlip: (habit) =>
      loggedToday(habit) ? void store.toggleDay(habit.id) : setSlipping({ habit, open: true }),
    dialog: (
      <LogSlipDialog
        habit={slipping?.habit ?? null}
        open={slipping?.open ?? false}
        onLog={(asked) => {
          // unless it already is, say from another tab while the sheet was open
          const habit = store.habits().find((h) => h.id === asked.id);
          if (habit && !loggedToday(habit)) void store.toggleDay(habit.id);
        }}
        onClose={close}
      />
    ),
  };
}

/**
 * Asks before logging today's slip on a quit habit, since a slip ends its current streak.
 * `habit` is the habit as it was when asked, so the words don't change while the sheet leaves.
 */
function LogSlipDialog({
  habit,
  open,
  onLog,
  onClose,
}: {
  habit: Habit | null;
  open: boolean;
  onLog: (habit: Habit) => void;
  onClose: () => void;
}) {
  const days = habit ? currentStreakDays(habit) : 0;
  useBackCloses(open && habit !== null, onClose);
  const keepCounting = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open && habit !== null} onOpenChange={(isOpen) => !isOpen && onClose()}>
      {/* starts on the safe choice, so a second Enter doesn't log the slip */}
      <DialogContent initialFocus={keepCounting}>
        <DialogTitle>Log a slip for {habit?.name}?</DialogTitle>
        <DialogDescription>
          {days > 0
            ? `Your ${days}-day streak moves to Stats and the count starts again from today.`
            : "The count starts again from today."}
        </DialogDescription>
        <DialogActions>
          <Button
            onClick={() => {
              // a second tap while the sheet leaves must not remove the slip again
              if (!open || !habit) return;
              onLog(habit);
              onClose();
            }}
          >
            Log slip
          </Button>
          <DialogClose asChild>
            <Button ref={keepCounting} variant="secondary">
              Keep counting
            </Button>
          </DialogClose>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
