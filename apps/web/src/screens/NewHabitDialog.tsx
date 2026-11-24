import { useState, type FormEvent } from "react";
import {
  HABIT_NAME_MAX_LENGTH,
  GOALS,
  HABIT_COLORS,
  canBeQuitDay,
  todayISO,
  type ColorId,
  type Kind,
} from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import { Dialog, DialogContent, DialogTitle } from "@streakky/ui/components/dialog";
import { Field, FieldSet } from "@streakky/ui/components/field";
import { HabitColorPicker } from "@streakky/ui/components/habit/color-picker";
import { Input } from "@streakky/ui/components/input";
import { Segmented } from "@streakky/ui/components/segmented";
import { ToggleChip, ToggleGroup } from "@streakky/ui/components/toggle-group";
import { useHabitStore, useHabits } from "../store/react.tsx";
import { useBackCloses } from "./stack.tsx";

const HINT: Record<Kind, string> = {
  build: "Check in each day you do it. A missed day ends the streak.",
  quit: "Counts up every day by itself. Log a slip only if it happens.",
};

export function NewHabitDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useBackCloses(open, onClose);
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
  const [goal, setGoal] = useState("none");
  const [nameError, setNameError] = useState("");
  const [quitDayError, setQuitDayError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setNameError("Give the habit a name.");
    const chosen = { name: trimmed, color, goal: goal === "none" ? null : Number(goal) };
    if (kind === "build") {
      await store.createHabit({ kind, ...chosen });
    } else {
      const day = quitDay || today;
      if (!canBeQuitDay(day)) return setQuitDayError("Pick today or a day before it.");
      await store.createHabit({ kind, ...chosen, quitDay: day });
    }
    onDone();
  };

  return (
    <form className="grid gap-[1.125rem]" onSubmit={submit} noValidate>
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
        <p className="text-[0.8125rem] text-muted-foreground">{HINT[kind]}</p>
      </div>
      <Field label="Name" error={nameError}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            value={name}
            maxLength={HABIT_NAME_MAX_LENGTH}
            placeholder={kind === "build" ? "Morning run" : "No smoking"}
            autoComplete="off"
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError("");
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
      {/* the chosen goal takes the habit's colour, as on the habit's Goal tab */}
      <div data-habit-color={color} className="contents">
        <FieldSet legend="Goal">
          <ToggleGroup value={goal} onValueChange={setGoal} aria-label="Goal in days">
            {GOALS.map((days) => (
              <ToggleChip key={days} value={String(days)}>
                {days}
              </ToggleChip>
            ))}
            <ToggleChip value="none">None</ToggleChip>
          </ToggleGroup>
        </FieldSet>
      </div>
      <Button type="submit" className="w-full">
        Add habit
      </Button>
    </form>
  );
}
