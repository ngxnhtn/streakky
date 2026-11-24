import { Note, NoteLink } from "@streakky/ui/components/note";
import { insideNativeApp } from "../platform.ts";
import {
  useArchivedHabits,
  useHabitStore,
  useHabits,
  useSettings,
  useSyncStatus,
} from "../store/react.tsx";
import { useNav } from "./stack.tsx";

/**
 * Whether Home shows the signed-out note: on the web, while signed out and once there is a habit
 * to lose, archived ones included, until it's dismissed on this device. The Android app keeps its
 * data in its own storage, so it never shows the note.
 */
export function useSignedOutNoteShown(): boolean {
  const { signedIn } = useSyncStatus();
  const { signedOutNoteDismissed } = useSettings();
  const hasHabits = useHabits().length + useArchivedHabits().length > 0;
  return !signedIn && !signedOutNoteDismissed && hasHabits && !insideNativeApp();
}

/** One small note that the habits live only in this browser, which opens sign-in. */
export function SignedOutNote() {
  const store = useHabitStore();
  const { push } = useNav();
  const shown = useSignedOutNoteShown();
  if (!shown) return null;
  return (
    <div data-slot="signed-out-note" className="px-5 pb-5">
      <Note
        onClick={() => push({ name: "sign-in" })}
        dismissLabel="Dismiss the note"
        onDismiss={() => store.changeSettings({ signedOutNoteDismissed: true })}
      >
        Your habits live only in this browser. <NoteLink>Sign in to sync them.</NoteLink>
      </Note>
    </div>
  );
}
