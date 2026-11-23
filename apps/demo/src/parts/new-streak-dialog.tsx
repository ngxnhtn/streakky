import { useState, type FormEvent } from "react";
import { STREAK_COLORS, today, toISO, type ColorId, type Mode } from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import { Dialog, DialogContent, DialogTitle } from "@streakky/ui/components/dialog";
import { Field, FieldSet } from "@streakky/ui/components/field";
import { Input } from "@streakky/ui/components/input";
import { Segmented } from "@streakky/ui/components/segmented";
import { StreakColorPicker } from "@streakky/ui/components/streak/color-picker";
import { ToggleChip, ToggleGroup } from "@streakky/ui/components/toggle-group";
import { useStore } from "../store.tsx";
import { useDialogShape } from "./shape.tsx";

const GOAL_CHOICES = ["7", "21", "30", "90", "365", "none"];

const HINT: Record<Mode, string> = {
  build: "Log it each day you do it. A missed day ends the streak.",
  quit: "Counts up every day by itself. Log a slip only if it happens.",
};

export function NewStreakDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { shape, className } = useDialogShape();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent shape={shape} className={className}>
        <DialogTitle>New streak</DialogTitle>
        {/* the content unmounts once the sheet has left, so each open starts with a fresh form */}
        <NewStreakForm onDone={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function NewStreakForm({ onDone }: { onDone: () => void }) {
  const { streaks, dispatch } = useStore();
  const max = toISO(today());
  const nextColor = (): ColorId =>
    (STREAK_COLORS.find((c) => !streaks.some((s) => s.color === c.id)) ?? STREAK_COLORS[0]).id;

  const [mode, setMode] = useState<Mode>("build");
  const [name, setName] = useState("");
  // the raw input value: "" while a date is half typed
  const [start, setStart] = useState(max);
  const [color, setColor] = useState<ColorId | null>(null);
  const [goal, setGoal] = useState("30");
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setError("Give the streak a name.");
    dispatch({
      type: "add",
      name: n,
      mode,
      color: color ?? nextColor(),
      start: mode === "quit" && start && start <= max ? start : max,
      goal: goal === "none" ? null : Number(goal),
    });
    onDone();
  };

  return (
    <form className="grid gap-[18px]" onSubmit={submit} noValidate>
      <div className="grid gap-2">
        <Segmented
          label="Kind of streak"
          value={mode}
          onValueChange={setMode}
          options={[
            { value: "build", label: "Build a habit" },
            { value: "quit", label: "Quit a habit" },
          ]}
        />
        <p className="text-[13px] text-muted-foreground">{HINT[mode]}</p>
      </div>
      <Field label="Name" error={error}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            value={name}
            placeholder={mode === "build" ? "Morning run" : "No smoking"}
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
      {mode === "quit" && (
        <Field label="Quit on" hint="Leave it empty to start today.">
          {({ id }) => (
            <Input
              id={id}
              type="date"
              value={start}
              max={max}
              onChange={(e) => setStart(e.target.value)}
            />
          )}
        </Field>
      )}
      <FieldSet legend="Colour">
        <StreakColorPicker value={color ?? nextColor()} onValueChange={setColor} />
      </FieldSet>
      <FieldSet legend="Goal">
        <ToggleGroup value={goal} onValueChange={setGoal} aria-label="Goal in days">
          {GOAL_CHOICES.map((g) => (
            <ToggleChip key={g} value={g}>
              {g === "none" ? "None" : g}
            </ToggleChip>
          ))}
        </ToggleGroup>
      </FieldSet>
      <Button type="submit" className="w-full">
        Add streak
      </Button>
    </form>
  );
}
