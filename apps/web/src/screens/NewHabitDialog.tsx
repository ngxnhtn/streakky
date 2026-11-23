import { useState, type FormEvent } from "react";
import { HABIT_COLORS, type ColorId } from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import { Dialog, DialogContent, DialogTitle } from "@streakky/ui/components/dialog";
import { Field, FieldSet } from "@streakky/ui/components/field";
import { HabitColorPicker } from "@streakky/ui/components/habit/color-picker";
import { Input } from "@streakky/ui/components/input";
import { useHabitStore, useHabits } from "../store/react.tsx";

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
  const [name, setName] = useState("");
  const [color, setColor] = useState<ColorId>((unused ?? HABIT_COLORS[0]).id);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Give the habit a name.");
    await store.createHabit({ kind: "build", name: trimmed, color });
    onDone();
  };

  return (
    <form className="grid gap-[18px]" onSubmit={submit} noValidate>
      <p className="text-[13px] text-muted-foreground">
        Check in each day you do it. A missed day ends the streak.
      </p>
      <Field label="Name" error={error}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            value={name}
            placeholder="Morning run"
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
      <FieldSet legend="Colour">
        <HabitColorPicker value={color} onValueChange={setColor} />
      </FieldSet>
      <Button type="submit" className="w-full">
        Add habit
      </Button>
    </form>
  );
}
