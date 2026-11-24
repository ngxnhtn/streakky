import { X } from "lucide-react";
import { Button } from "@streakky/ui/components/button";
import { insideNativeApp } from "../platform.ts";
import { useHabitStore, useHabits, useSettings, useSyncStatus } from "../store/react.tsx";
import { useNav } from "./stack.tsx";

/**
 * Whether Home shows the signed-out note: on the web, while signed out and once there is a habit
 * to lose, until it's dismissed on this device. The Android app keeps its data in its own
 * storage, so it never shows the note.
 */
export function useSignedOutNoteShown(): boolean {
  const { signedIn } = useSyncStatus();
  const { signedOutNoteDismissed } = useSettings();
  const hasHabits = useHabits().length > 0;
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
      <div className="flex items-center gap-1 rounded-2xl bg-muted py-1 pr-1 text-[0.875rem] leading-snug">
        <button
          type="button"
          onClick={() => push({ name: "sign-in" })}
          className="min-h-11 flex-1 rounded-2xl py-2 pl-4 text-left text-muted-foreground focus-ring-flush hover-fine:[&>span]:decoration-current"
        >
          Your habits live only in this browser.{" "}
          <span className="font-medium text-foreground underline decoration-input underline-offset-4">
            Sign in to back them up.
          </span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Dismiss the note"
          onClick={() => store.changeSettings({ signedOutNoteDismissed: true })}
        >
          <X strokeWidth={1.75} />
        </Button>
      </div>
    </div>
  );
}
