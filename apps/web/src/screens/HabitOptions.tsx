import { useRef, type RefObject } from "react";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import type { Habit } from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import {
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@streakky/ui/components/dialog";
import { List, ListButton } from "@streakky/ui/components/list";
import { useHabitStore } from "../store/react.tsx";
import { EditHabitForm } from "./EditHabit.tsx";
import { keepFocus, neighbourOfFocus } from "./focus.ts";
import { useBackCloses, useCloseWhenCovered, useNav } from "./stack.tsx";

/** The options sheet, or what it leads to: Edit habit, or the question before deleting. */
export type HabitDialog = "options" | "edit" | "delete" | null;

/** How long the screen has to slide away before the habit leaves the one beneath. */
const LEAVE_MS = 320;
/** How long to wait for the back that closes the sheet before leaving anyway. */
const BACK_TIMEOUT_MS = 1000;

/**
 * A habit's options sheet, opened from the app bar on its Habit detail: edit an active habit's
 * name, colour and quit day, archive the habit, or restore it once archived, and delete it after
 * asking. Archiving and deleting leave the screen
 * first and change the habit as the screen beneath comes back, so the habit is seen to leave it.
 * Restoring stays, and the screen becomes the active habit's again.
 */
export function HabitOptions({
  habit,
  archived,
  dialog,
  setDialog,
  optionsButton,
}: {
  habit: Habit;
  archived: boolean;
  dialog: HabitDialog;
  setDialog: (dialog: HabitDialog) => void;
  /** the app bar's button that opens the sheet, where focus goes back to */
  optionsButton: RefObject<HTMLElement | null>;
}) {
  const store = useHabitStore();
  const { pop } = useNav();
  useCloseWhenCovered(dialog !== null, () => setDialog(null));
  // one history entry for the sheet and the question after it, so back closes either
  useBackCloses(dialog !== null, () => setDialog(null));

  // the sheet, Edit habit and the question all give focus back to the options button, but not
  // while one leads to the next, nor once the screen is going
  const dialogNow = useRef(dialog);
  dialogNow.current = dialog;
  const leaving = useRef(false);
  const returnFocus = () =>
    dialogNow.current === null && !leaving.current ? optionsButton.current : null;
  const cancel = useRef<HTMLButtonElement>(null);

  /**
   * Goes back twice, as the browser's back button would: once to close the sheet, which has its
   * own history entry, then to leave the screen. Then it makes the change.
   */
  const leaveThen = (change: () => Promise<void>) => {
    // a second tap while the sheet leaves does nothing
    if (leaving.current) return;
    leaving.current = true;
    let left = false;
    const leave = () => {
      if (left) return;
      left = true;
      window.removeEventListener("popstate", leave);
      setDialog(null);
      pop();
      // focus is back on what opened the screen, such as the habit's card, which is about to go
      window.setTimeout(() => void keepFocus(change, neighbourOfFocus()), LEAVE_MS);
    };
    window.addEventListener("popstate", leave);
    history.back();
    // in case the sheet's entry never made it into history, so no popstate comes
    window.setTimeout(leave, BACK_TIMEOUT_MS);
  };

  return (
    <>
      <Dialog open={dialog === "options"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent shape="sheet" returnFocus={returnFocus}>
          <DialogTitle>{habit.name}</DialogTitle>
          <List className="-mx-1">
            {/* an archived habit stays as it was until it's restored, as its days do */}
            {!archived && (
              <ListButton onClick={() => setDialog("edit")}>
                Edit habit
                <Pencil />
              </ListButton>
            )}
            {archived ? (
              <ListButton
                onClick={() => {
                  setDialog(null);
                  void store.restoreHabit(habit.id);
                }}
              >
                Restore habit
                <ArchiveRestore />
              </ListButton>
            ) : (
              <ListButton onClick={() => leaveThen(() => store.archiveHabit(habit.id))}>
                Archive habit
                <Archive />
              </ListButton>
            )}
            <ListButton tone="destructive" onClick={() => setDialog("delete")}>
              Delete habit
              <Trash2 />
            </ListButton>
          </List>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "edit" && !archived}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        {/* starts on the sheet itself, not the name field, so a phone's keyboard waits until it's wanted */}
        <DialogContent shape="sheet" initialFocus="content" returnFocus={returnFocus}>
          {/* the content unmounts once the sheet has left, so each open starts from the habit */}
          <EditHabitForm habit={habit} onDone={() => setDialog(null)} />
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "delete"} onOpenChange={(open) => !open && setDialog(null)}>
        {/* starts on the safe choice, so a second Enter doesn't delete */}
        <DialogContent shape="sheet" initialFocus={cancel} returnFocus={returnFocus}>
          <DialogTitle>Delete {habit.name}?</DialogTitle>
          <DialogDescription>
            {archived
              ? "Its whole history goes with it, and this can't be undone."
              : "Its whole history goes with it, and this can't be undone. To take it off Home and keep its history, archive it instead."}
          </DialogDescription>
          <DialogActions>
            <Button
              variant="destructive"
              onClick={() => leaveThen(() => store.deleteHabit(habit.id))}
            >
              Delete habit
            </Button>
            <DialogClose asChild>
              <Button ref={cancel} variant="secondary">
                Cancel
              </Button>
            </DialogClose>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </>
  );
}
