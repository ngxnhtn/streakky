import { useRef } from "react";
import { currentStreakDays, type Habit } from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import {
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@streakky/ui/components/dialog";

/**
 * Asks before logging today's slip on a quit habit, since a slip ends its current streak.
 * `habit` is the habit as it was when asked, so the words don't change while the sheet leaves.
 */
export function LogSlipDialog({
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
  // with no DialogTrigger, Radix would drop focus on the page; return it to the slip button
  const opener = useRef<HTMLElement | null>(null);
  const keepCounting = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open && habit !== null} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        shape="sheet"
        onOpenAutoFocus={(e) => {
          opener.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          // start on the safe choice, so a second Enter doesn't log the slip
          e.preventDefault();
          keepCounting.current?.focus();
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          opener.current?.focus();
        }}
      >
        <DialogTitle>Log a slip for {habit?.name}?</DialogTitle>
        <DialogDescription>
          {days > 0
            ? `Your ${days}-day streak ends and the count starts again from today.`
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
