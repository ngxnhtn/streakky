import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  canBeQuitDay,
  fmtShort,
  plural,
  slipsRemovedByMovingQuitDay,
  todayISO,
  type ColorId,
  type Habit,
} from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import { DialogActions, DialogDescription, DialogTitle } from "@streakky/ui/components/dialog";
import { Field, FieldSet } from "@streakky/ui/components/field";
import { HabitColorPicker } from "@streakky/ui/components/habit/color-picker";
import { Input } from "@streakky/ui/components/input";
import { useHabitStore } from "../store/react.tsx";

/**
 * Edit habit, from the habit's options: its name, colour and, for a quit habit, its quit day.
 * The kind stays as it was created. If the new quit day would remove slips, the sheet asks
 * first, saying how many; going back from there changes nothing.
 */
export function EditHabitForm({ habit, onDone }: { habit: Habit; onDone: () => void }) {
  const store = useHabitStore();
  const today = todayISO();
  const [name, setName] = useState(habit.name);
  const [color, setColor] = useState<ColorId>(habit.color);
  // the raw input value: "" while a date is half typed or cleared
  const [quitDay, setQuitDay] = useState(habit.kind === "quit" ? habit.quitDay : "");
  const [nameError, setNameError] = useState("");
  const [quitDayError, setQuitDayError] = useState("");
  // the slips the new quit day would remove, while the sheet asks about them
  const [removing, setRemoving] = useState<string[] | null>(null);
  const quitDayInput = useRef<HTMLInputElement>(null);
  const backFromAsking = useRef(false);
  useEffect(() => {
    if (removing || !backFromAsking.current) return;
    backFromAsking.current = false;
    quitDayInput.current?.focus();
  }, [removing]);

  const movesQuitDay = habit.kind === "quit" && quitDay !== habit.quitDay;
  const save = async () => {
    await store.editHabit(habit.id, { name: name.trim(), color });
    if (movesQuitDay) await store.moveQuitDay(habit.id, quitDay);
    onDone();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setNameError("The name can't be empty.");
    if (habit.kind === "quit" && movesQuitDay) {
      if (!canBeQuitDay(quitDay)) return setQuitDayError("Pick today or a day before it.");
      const removed = slipsRemovedByMovingQuitDay(habit, quitDay);
      if (removed.length > 0) return setRemoving(removed);
    }
    void save();
  };

  if (removing) {
    return (
      <RemoveSlips
        slips={removing}
        quitDay={quitDay}
        onConfirm={() => void save()}
        onCancel={() => {
          backFromAsking.current = true;
          setRemoving(null);
        }}
      />
    );
  }
  return (
    <>
      <DialogTitle>Edit habit</DialogTitle>
      <form className="grid gap-[1.125rem]" onSubmit={submit} noValidate>
        <Field label="Name" error={nameError}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              value={name}
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
        {habit.kind === "quit" && (
          <Field label="Quit on" error={quitDayError}>
            {({ id, describedBy, invalid }) => (
              <Input
                ref={quitDayInput}
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
          Save changes
        </Button>
      </form>
    </>
  );
}

/** Asks before a new quit day removes slips, naming how many and which days. */
function RemoveSlips({
  slips,
  quitDay,
  onConfirm,
  onCancel,
}: {
  slips: string[];
  quitDay: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  // start on the safe choice, so a second Enter doesn't remove the slips
  useEffect(() => cancel.current?.focus(), []);
  const days = slips.map((day) => fmtShort(day));
  const which =
    days.length > 3
      ? `from ${days[0]} to ${days.at(-1)}`
      : `on ${days.length > 1 ? `${days.slice(0, -1).join(", ")} and ${days.at(-1)}` : days[0]}`;
  return (
    <>
      <DialogTitle>Move the quit day to {fmtShort(quitDay)}?</DialogTitle>
      <DialogDescription>
        This removes {plural(slips.length, "slip")}, {which}. Only days after the quit day can have
        slips.
      </DialogDescription>
      <DialogActions>
        <Button variant="destructive" onClick={onConfirm}>
          Move quit day
        </Button>
        <Button ref={cancel} variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </DialogActions>
    </>
  );
}
