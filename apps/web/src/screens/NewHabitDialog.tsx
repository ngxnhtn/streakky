import { useState, type FormEvent } from "react";
import { HABIT_COLORS, canBeQuitDay, todayISO, type ColorId, type Kind } from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import { Dialog, DialogContent, DialogTitle } from "@streakky/ui/components/dialog";
import { FieldSet } from "@streakky/ui/components/field";
import { HabitColorPicker } from "@streakky/ui/components/habit/color-picker";
import { GoalPicker } from "@streakky/ui/components/habit/goal";
import { NameField, QuitDayField } from "@streakky/ui/components/habit/habit-fields";
import { Segmented } from "@streakky/ui/components/segmented";
import { KIND_COPY } from "@streakky/ui/lib/kind-copy";
import { useHabitStore, useHabits } from "../store/react.tsx";
import { useBackCloses } from "./stack.tsx";
import { SaveError, useSave } from "./saving.tsx";

/**
 * Once New habit closes, focus goes back to what opened it, or to the New habit tile if that has
 * gone, as "Add a habit" does once the first habit is there.
 */
const backToOpener = (opener: HTMLElement | null) =>
  opener?.isConnected ? opener : document.querySelector<HTMLElement>('[data-slot="new-habit"]');

export function NewHabitDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useBackCloses(open, onClose);
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent shape="sheet" returnFocus={backToOpener}>
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
  const [goal, setGoal] = useState<number | null>(null);
  const [nameError, setNameError] = useState("");
  const [quitDayError, setQuitDayError] = useState("");
  // a double tap on Add habit adds one habit
  const { saving, error, save } = useSave("The habit wasn't added. Try again.");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setNameError("Give the habit a name.");
    const chosen = { name: trimmed, color, goal };
    const day = quitDay || today;
    if (kind === "quit" && !canBeQuitDay(day)) {
      return setQuitDayError("Pick today or a day before it.");
    }
    const added = await save(() =>
      kind === "build"
        ? store.createHabit({ kind, ...chosen })
        : store.createHabit({ kind, ...chosen, quitDay: day }),
    );
    if (added) onDone();
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
        <p className="text-[0.8125rem] text-muted-foreground">{KIND_COPY[kind].hint}</p>
      </div>
      <NameField
        value={name}
        placeholder={KIND_COPY[kind].namePlaceholder}
        error={nameError}
        onChange={(value) => {
          setName(value);
          setNameError("");
        }}
      />
      {kind === "quit" && (
        <QuitDayField
          value={quitDay}
          hint="Leave it empty to start today."
          error={quitDayError}
          onChange={(value) => {
            setQuitDay(value);
            setQuitDayError("");
          }}
        />
      )}
      <FieldSet legend="Colour">
        <HabitColorPicker value={color} onValueChange={setColor} />
      </FieldSet>
      {/* the chosen goal takes the habit's colour, as on the habit's Goal tab */}
      <div data-habit-color={color} className="contents">
        <FieldSet legend="Goal">
          <GoalPicker value={goal} onValueChange={setGoal} />
        </FieldSet>
      </div>
      <SaveError>{error}</SaveError>
      <Button type="submit" className="w-full" disabled={saving}>
        Add habit
      </Button>
    </form>
  );
}
