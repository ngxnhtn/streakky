import { useState, type FormEvent } from "react";
import { HABIT_COLORS, canBeQuitDay, todayISO, type ColorId, type Kind } from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import { Dialog, DialogContent, DialogTitle } from "@streakky/ui/components/dialog";
import { Field, FieldSet } from "@streakky/ui/components/field";
import { HabitColorPicker } from "@streakky/ui/components/habit/color-picker";
import { Input } from "@streakky/ui/components/input";
import { Segmented } from "@streakky/ui/components/segmented";
import { useHabitStore, useHabits } from "../store/react.tsx";

const HINT: Record<Kind, string> = {
  build: "Check in each day you do it. A missed day ends the streak.",
  quit: "Counts up every day by itself. Log a slip only if it happens.",
};

export function NewHabitDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent shape="sheet">
        <DialogTitle>New habit</DialogTitle>
        {/* the content unmounts once the sheet has left, so each open starts with a fresh form */}
        <NewHabitForm onDone={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function NewHabitForm({ onDone }: { onDone: () => void }) {
  const store = useHabitStore();
  const habits = useHabits();
  const unused = HABIT_COLORS.find((c) => !habits.some((h) => h.color === c.id));
  const today = todayISO();
  const [kind, setKind] = useState<Kind>("build");
  const [name, setName] = useState("");
  // the raw input value: "" while a date is half typed or cleared
  const [quitDay, setQuitDay] = useState(today);
  const [color, setColor] = useState<ColorId>((unused ?? HABIT_COLORS[0]).id);
  const [error, setError] = useState("");
  const [quitDayError, setQuitDayError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Give the habit a name.");
    if (kind === "build") {
      await store.createHabit({ kind, name: trimmed, color });
    } else {
      const day = quitDay || today;
      if (!canBeQuitDay(day)) return setQuitDayError("Pick today or a day before it.");
      await store.createHabit({ kind, name: trimmed, color, quitDay: day });
    }
    onDone();
  };

  return (
    <form className="grid gap-[18px]" onSubmit={submit} noValidate>
      <div className="grid gap-2">
        <Segmented
          label="Kind of habit"
          value={kind}
          onValueChange={setKind}
          options={[
            { value: "build", label: "Build a habit" },
            { value: "quit", label: "Quit a habit" },
          ]}
        />
        <p className="text-[13px] text-muted-foreground">{HINT[kind]}</p>
      </div>
      <Field label="Name" error={error}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            value={name}
            placeholder={kind === "build" ? "Morning run" : "No smoking"}
            autoComplete="off"
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
          />
        )}
      </Field>
      {kind === "quit" && (
        <Field label="Quit on" hint="Leave it empty to start today." error={quitDayError}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="date"
              value={quitDay}
              max={today}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              onChange={(e) => {
                setQuitDay(e.target.value);
                if (quitDayError) setQuitDayError("");
              }}
            />
          )}
        </Field>
      )}
      <FieldSet legend="Colour">
        <HabitColorPicker value={color} onValueChange={setColor} />
      </FieldSet>
      <Button type="submit" className="w-full">
        Add habit
      </Button>
    </form>
  );
}
