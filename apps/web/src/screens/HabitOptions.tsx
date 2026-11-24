import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import type { Habit } from "@streakky/core";
import { Dialog, DialogContent, DialogTitle } from "@streakky/ui/components/dialog";
import { List, ListButton } from "@streakky/ui/components/list";
import { EditHabitForm } from "./EditHabit.tsx";
import { useBackCloses } from "./stack.tsx";

/**
 * A habit's options, from the right of Habit detail's app bar. Each entry opens its step in the
 * same sheet, so the sheet has one history entry and one place to return focus: the button that
 * opened it.
 */
export function HabitOptions({
  habit,
  open,
  onClose,
}: {
  habit: Habit;
  open: boolean;
  onClose: () => void;
}) {
  useBackCloses(open, onClose);
  // with no DialogTrigger, Radix would drop focus on the page; return it to the options button
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        shape="sheet"
        onOpenAutoFocus={() => {
          opener.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          opener.current?.focus();
        }}
      >
        {/* the content unmounts once the sheet has left, so each open starts on the options */}
        <OptionsSteps habit={habit} onDone={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function OptionsSteps({ habit, onDone }: { habit: Habit; onDone: () => void }) {
  const [step, setStep] = useState<"options" | "edit">("options");
  if (step === "edit") return <EditHabitForm habit={habit} onDone={onDone} />;
  return (
    <>
      <DialogTitle>{habit.name}</DialogTitle>
      <List className="-mx-1">
        <ListButton onClick={() => setStep("edit")}>
          Edit habit
          <Pencil />
        </ListButton>
      </List>
    </>
  );
}
