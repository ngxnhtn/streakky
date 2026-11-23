import { useState, type FormEvent } from "react";
import { plural, runsOf, type ColorId, type Streak } from "@streakky/core";
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
import { StreakColorPicker } from "@streakky/ui/components/streak/color-picker";
import { Pencil, Trash2 } from "lucide-react";
import { useStore } from "../store.tsx";
import { useDialogShape } from "./shape.tsx";

export type StreakDialog = "options" | "edit" | "slip" | "delete" | null;

/** Options (phones), edit, log a slip and delete: the same dialogs on every platform. */
export function StreakDialogs({
  streak,
  dialog,
  setDialog,
  onDelete,
}: {
  streak: Streak;
  dialog: StreakDialog;
  setDialog: (d: StreakDialog) => void;
  /** leave the streak's page, then remove it */
  onDelete: () => void;
}) {
  const { dispatch } = useStore();
  const { shape, className } = useDialogShape();
  const id = streak.id;
  const runs = runsOf(streak);
  const days = runs[runs.length - 1].days;
  const openChange = (d: StreakDialog) => (open: boolean) => setDialog(open ? d : null);

  return (
    <>
      <Dialog open={dialog === "options"} onOpenChange={openChange("options")}>
        <DialogContent shape={shape} className={className}>
          <DialogTitle>{streak.name}</DialogTitle>
          <List className="-mx-1">
            <ListButton onClick={() => setDialog("edit")}>
              Edit name and colour
              <Pencil />
            </ListButton>
            <ListButton tone="destructive" onClick={() => setDialog("delete")}>
              Delete streak
              <Trash2 />
            </ListButton>
          </List>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "edit"} onOpenChange={openChange("edit")}>
        <DialogContent shape={shape} className={className}>
          <DialogTitle>Edit streak</DialogTitle>
          <EditForm
            key={`${streak.name}-${streak.color}`}
            streak={streak}
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
              ? `Your ${days}-day run moves to Stats and the count starts again from today.`
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
          <DialogTitle>Delete {streak.name}?</DialogTitle>
          <DialogDescription>
            The streak and all {plural(runs.length, "run")} go for good.
          </DialogDescription>
          <DialogActions>
            <Button
              variant="destructive"
              onClick={() => {
                setDialog(null);
                onDelete();
              }}
            >
              Delete streak
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
  streak,
  onSave,
}: {
  streak: Streak;
  onSave: (name: string, color: ColorId) => void;
}) {
  const [name, setName] = useState(streak.name);
  const [color, setColor] = useState<ColorId>(streak.color);
  const [error, setError] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setError("The name can't be empty.");
    onSave(n, color);
  };
  return (
    <form className="grid gap-[18px]" onSubmit={submit} noValidate>
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
        <StreakColorPicker value={color} onValueChange={setColor} />
      </FieldSet>
      <Button type="submit" className="w-full">
        Save changes
      </Button>
    </form>
  );
}
