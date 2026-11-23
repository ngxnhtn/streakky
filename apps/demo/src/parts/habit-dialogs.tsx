import { useState, type FormEvent } from "react";
import { plural, streaksOf, type ColorId, type Habit } from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import {
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@streakky/ui/components/dialog";
import { Field, FieldSet } from "@streakky/ui/components/field";
import { Input } from "@streakky/ui/components/input";
import { List, ListButton } from "@streakky/ui/components/list";
import { HabitColorPicker } from "@streakky/ui/components/habit/color-picker";
import { Pencil, Trash2 } from "lucide-react";
import { useStore } from "../store.tsx";
import { useDialogShape } from "./shape.tsx";

export type HabitDialog = "options" | "edit" | "slip" | "delete" | null;

/** Options (phones), edit, log a slip and delete: the same dialogs on every platform. */
export function HabitDialogs({
  habit,
  dialog,
  setDialog,
  onDelete,
}: {
  habit: Habit;
  dialog: HabitDialog;
  setDialog: (d: HabitDialog) => void;
  /** leave the habit's page, then remove it */
  onDelete: () => void;
}) {
  const { dispatch } = useStore();
  const { shape, className } = useDialogShape();
  const id = habit.id;
  const streaks = streaksOf(habit);
  const days = streaks[streaks.length - 1].days;
  const openChange = (d: HabitDialog) => (open: boolean) => setDialog(open ? d : null);

  return (
    <>
      <Dialog open={dialog === "options"} onOpenChange={openChange("options")}>
        <DialogContent shape={shape} className={className}>
          <DialogTitle>{habit.name}</DialogTitle>
          <List className="-mx-1">
            <ListButton onClick={() => setDialog("edit")}>
              Edit name and colour
              <Pencil />
            </ListButton>
            <ListButton tone="destructive" onClick={() => setDialog("delete")}>
              Delete habit
              <Trash2 />
            </ListButton>
          </List>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "edit"} onOpenChange={openChange("edit")}>
        <DialogContent shape={shape} className={className}>
          <DialogTitle>Edit habit</DialogTitle>
          <EditForm
            key={`${habit.name}-${habit.color}`}
            habit={habit}
            onSave={(name, color) => {
              dispatch({ type: "edit", id, name, color });
              setDialog(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "slip"} onOpenChange={openChange("slip")}>
        <DialogContent shape={shape} className={className}>
          <DialogTitle>Log a slip?</DialogTitle>
          <DialogDescription>
            {days > 0
              ? `Your ${days}-day streak moves to Stats and the count starts again from today.`
              : "The count starts again from today."}
          </DialogDescription>
          <DialogActions>
            <Button
              onClick={() => {
                dispatch({ type: "toggle-day", id });
                setDialog(null);
              }}
            >
              Log slip
            </Button>
            <DialogClose asChild>
              <Button variant="secondary">Keep counting</Button>
            </DialogClose>
          </DialogActions>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "delete"} onOpenChange={openChange("delete")}>
        <DialogContent shape={shape} className={className}>
          <DialogTitle>Delete {habit.name}?</DialogTitle>
          <DialogDescription>
            The habit and all {plural(streaks.length, "streak")} go for good.
          </DialogDescription>
          <DialogActions>
            <Button
              variant="destructive"
              onClick={() => {
                setDialog(null);
                onDelete();
              }}
            >
              Delete habit
            </Button>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditForm({
  habit,
  onSave,
}: {
  habit: Habit;
  onSave: (name: string, color: ColorId) => void;
}) {
  const [name, setName] = useState(habit.name);
  const [color, setColor] = useState<ColorId>(habit.color);
  const [error, setError] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setError("The name can't be empty.");
    onSave(n, color);
  };
  return (
    <form className="grid gap-[1.125rem]" onSubmit={submit} noValidate>
      <Field label="Name" error={error}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            value={name}
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
        Save changes
      </Button>
    </form>
  );
}
