import { useRef, useState, type ReactNode, type RefObject } from "react";
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
type HabitDialog = "options" | "edit" | "delete" | null;

/** How long the screen has to slide away before the habit leaves the one beneath. */
const LEAVE_MS = 320;
/** How long to wait for the back that closes the sheet before leaving anyway. */
const BACK_TIMEOUT_MS = 1000;

/** One of a habit's options, as the phone's sheet and the desktop's buttons both show it. */
export type HabitOption = {
  label: string;
  icon: ReactNode;
  /** deleting, shown in the destructive colour */
  destructive?: boolean;
  /** opens a dialog: Edit habit, or the question before deleting */
  opensDialog?: boolean;
  choose: () => void;
};

/** A habit's options and the dialogs they open, for its Habit detail to show. */
export type HabitOptions = {
  /** phone: the options sheet, from the app bar */
  showSheet: () => void;
  /** in order: Edit habit on an active habit, Archive or Restore, then Delete */
  options: HabitOption[];
  /** the sheet and dialogs, for the screen to render once */
  dialogs: ReactNode;
};

/**
 * A habit's options: edit an active habit's name, colour and quit day, archive the habit, or
 * restore it once archived, and delete it after asking. In the phone layout they're in a sheet
 * from the app bar; on the desktop, buttons beside the heading. Archiving and deleting leave the
 * screen first and change the habit as the screen beneath comes back, so the habit is seen to
 * leave it. Restoring stays, and the screen becomes the active habit's again.
 */
export function useHabitOptions({
  habit,
  archived,
  optionsButton,
}: {
  /** none once the habit has gone, say deleted on another device */
  habit: Habit | undefined;
  archived: boolean;
  /** phone: the app bar's button that opens the sheet, where focus goes back to */
  optionsButton: RefObject<HTMLElement | null>;
}): HabitOptions {
  const store = useHabitStore();
  const { pop } = useNav();
  const [dialog, setDialog] = useState<HabitDialog>(null);
  useCloseWhenCovered(dialog !== null, () => setDialog(null));
  // one history entry for the sheet and the question after it, so back closes either
  useBackCloses(dialog !== null, () => setDialog(null));

  // The sheet, Edit habit and the question all give focus back to the options button, or on the
  // desktop to the button that opened them, but not while one leads to the next, nor once the
  // screen is going.
  const dialogNow = useRef(dialog);
  dialogNow.current = dialog;
  const leaving = useRef(false);
  const returnFocus = (opener: HTMLElement | null) =>
    dialogNow.current === null && !leaving.current ? (optionsButton.current ?? opener) : null;
  const cancel = useRef<HTMLButtonElement>(null);

  /**
   * Leaves the screen, then makes the change. With the sheet or the question open, it goes back
   * twice, as the browser's back button would: once to close it, which has its own history entry,
   * then to leave the screen. From the desktop's buttons, with nothing open, it leaves at once.
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
    if (dialogNow.current === null) {
      leave();
      return;
    }
    window.addEventListener("popstate", leave);
    history.back();
    // in case the sheet's entry never made it into history, so no popstate comes
    window.setTimeout(leave, BACK_TIMEOUT_MS);
  };

  // an archived habit stays as it was until it's restored, as its days do
  const options: HabitOption[] = [
    ...(archived
      ? []
      : [
          {
            label: "Edit habit",
            icon: <Pencil />,
            opensDialog: true,
            choose: () => setDialog("edit"),
          },
        ]),
    archived
      ? {
          label: "Restore habit",
          icon: <ArchiveRestore />,
          choose: () => {
            setDialog(null);
            if (habit) void store.restoreHabit(habit.id);
          },
        }
      : {
          label: "Archive habit",
          icon: <Archive />,
          choose: () => habit && leaveThen(() => store.archiveHabit(habit.id)),
        },
    {
      label: "Delete habit",
      icon: <Trash2 />,
      destructive: true,
      opensDialog: true,
      choose: () => setDialog("delete"),
    },
  ];

  const dialogs = habit && (
    <>
      <Dialog open={dialog === "options"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent returnFocus={returnFocus}>
          <DialogTitle>{habit.name}</DialogTitle>
          <List className="-mx-1">
            {options.map((option) => (
              <ListButton
                key={option.label}
                tone={option.destructive ? "destructive" : undefined}
                onClick={option.choose}
              >
                {option.label}
                {option.icon}
              </ListButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "edit" && !archived}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        {/* starts on the sheet itself, not the name field, so a phone's keyboard waits until it's wanted */}
        <DialogContent initialFocus="content" returnFocus={returnFocus}>
          {/* the content unmounts once the sheet has left, so each open starts from the habit */}
          <EditHabitForm habit={habit} onDone={() => setDialog(null)} />
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "delete"} onOpenChange={(open) => !open && setDialog(null)}>
        {/* starts on the safe choice, so a second Enter doesn't delete */}
        <DialogContent initialFocus={cancel} returnFocus={returnFocus}>
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
  return { showSheet: () => setDialog("options"), options, dialogs };
}
