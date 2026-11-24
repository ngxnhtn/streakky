import { useState, type FormEvent } from "react";
import {
  canBeQuitDay,
  fmtShort,
  plural,
  slipsCountedAgainByMovingQuitDay,
  slipsRemovedByMovingQuitDay,
  type ColorId,
  type Habit,
} from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import { DialogActions, DialogDescription, DialogTitle } from "@streakky/ui/components/dialog";
import { FieldSet } from "@streakky/ui/components/field";
import { HabitColorPicker } from "@streakky/ui/components/habit/color-picker";
import { NameField, QuitDayField } from "@streakky/ui/components/habit/habit-fields";
import { useHabitStore } from "../store/react.tsx";
import { SaveError, useSave } from "./saving.tsx";

/** The slips a new quit day changes: the ones it removes, and the ones it counts again. */
type SlipChanges = { removed: string[]; countedAgain: string[] };

/**
 * Edit habit, from the habit's options: its name, colour and, for a quit habit, its quit day.
 * The kind stays as it was created. If the new quit day would remove slips, or count again slips
 * that don't count now, the sheet asks first, saying which; going back from there changes nothing.
 */
export function EditHabitForm({ habit, onDone }: { habit: Habit; onDone: () => void }) {
  const store = useHabitStore();
  const [name, setName] = useState(habit.name);
  const [color, setColor] = useState<ColorId>(habit.color);
  // the raw input value: "" while a date is half typed or cleared
  const [quitDay, setQuitDay] = useState(habit.kind === "quit" ? habit.quitDay : "");
  const [nameError, setNameError] = useState("");
  const [quitDayError, setQuitDayError] = useState("");
  // what the new quit day does to the slips, while the sheet asks about it
  const [asking, setAsking] = useState<SlipChanges | null>(null);
  // back from asking, focus goes back to the date the question was about
  const [askedBefore, setAskedBefore] = useState(false);
  const { saving, error, save } = useSave("The changes weren't saved. Try again.");

  const movesQuitDay = habit.kind === "quit" && quitDay !== habit.quitDay;
  const saveChanges = async () => {
    const saved = await save(async () => {
      await store.editHabit(habit.id, { name: name.trim(), color });
      if (movesQuitDay) await store.moveQuitDay(habit.id, quitDay);
    });
    if (saved) onDone();
    else setAsking(null);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setNameError("The name can't be empty.");
    if (habit.kind === "quit" && movesQuitDay) {
      if (!canBeQuitDay(quitDay)) return setQuitDayError("Pick today or a day before it.");
      const removed = slipsRemovedByMovingQuitDay(habit, quitDay);
      const countedAgain = slipsCountedAgainByMovingQuitDay(habit, quitDay);
      if (removed.length > 0 || countedAgain.length > 0) {
        return setAsking({ removed, countedAgain });
      }
    }
    void saveChanges();
  };

  if (asking) {
    return (
      <QuitDayQuestion
        quitDay={quitDay}
        changes={asking}
        saving={saving}
        onConfirm={() => void saveChanges()}
        onCancel={() => {
          setAskedBefore(true);
          setAsking(null);
        }}
      />
    );
  }
  return (
    <>
      <DialogTitle>Edit habit</DialogTitle>
      <form className="grid gap-[1.125rem]" onSubmit={submit} noValidate>
        <NameField
          value={name}
          error={nameError}
          onChange={(value) => {
            setName(value);
            setNameError("");
          }}
        />
        {habit.kind === "quit" && (
          <QuitDayField
            value={quitDay}
            error={quitDayError}
            autoFocus={askedBefore}
            onChange={(value) => {
              setQuitDay(value);
              setQuitDayError("");
            }}
          />
        )}
        <FieldSet legend="Colour">
          <HabitColorPicker value={color} onValueChange={setColor} />
        </FieldSet>
        <SaveError>{error}</SaveError>
        <Button type="submit" className="w-full" disabled={saving}>
          Save changes
        </Button>
      </form>
    </>
  );
}

/** "on Mon 16 Nov", "on Mon 16 Nov and Fri 20 Nov", or with more than three, "from … to …". */
function daysOf(slips: string[]): string {
  const days = slips.map((day) => fmtShort(day));
  if (days.length > 3) return `from ${days[0]} to ${days.at(-1)}`;
  return `on ${days.length > 1 ? `${days.slice(0, -1).join(", ")} and ${days.at(-1)}` : days[0]}`;
}

/**
 * Asks before a new quit day changes which slips count: the ones it removes, since only days
 * after the quit day can have slips, and the ones on or before the quit day now, which don't
 * count but would fall after the new one. It names how many and which days, and starts on Cancel.
 */
function QuitDayQuestion({
  quitDay,
  changes: { removed, countedAgain },
  saving,
  onConfirm,
  onCancel,
}: {
  quitDay: string;
  changes: SlipChanges;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const one = countedAgain.length === 1;
  return (
    <>
      <DialogTitle>Move the quit day to {fmtShort(quitDay)}?</DialogTitle>
      <DialogDescription>
        {removed.length > 0 &&
          `This removes ${plural(removed.length, "slip")}, ${daysOf(removed)}. Only days after the quit day can have slips.`}
        {removed.length > 0 && countedAgain.length > 0 && " "}
        {countedAgain.length > 0 &&
          `This counts ${plural(countedAgain.length, "slip")} again, ${daysOf(countedAgain)}. ${one ? "It was" : "They were"} on or before the quit day, so ${one ? "it" : "they"} didn't count.`}
      </DialogDescription>
      <DialogActions>
        <Button
          variant={removed.length > 0 ? "destructive" : "default"}
          disabled={saving}
          onClick={onConfirm}
        >
          Move quit day
        </Button>
        {/* the safe choice first, so a second Enter doesn't move the quit day */}
        <Button variant="secondary" autoFocus onClick={onCancel}>
          Cancel
        </Button>
      </DialogActions>
    </>
  );
}
