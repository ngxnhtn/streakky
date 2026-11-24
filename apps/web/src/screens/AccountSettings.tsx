import { useEffect, useId, useRef, useState } from "react";
import { ChevronRight, LogOut } from "lucide-react";
import { dayOf, fmtDayMonth, fmtTime, plural, todayISO } from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import {
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@streakky/ui/components/dialog";
import { List, ListButton, ListGroup, ListItem, ListLabel } from "@streakky/ui/components/list";
import { useHabitStore, useSyncStatus } from "../store/react.tsx";
import { SaveError } from "./saving.tsx";
import { useBackCloses, useCloseWhenCovered, useNav } from "./stack.tsx";

/**
 * When this device last synced, in words, in the time zone days follow: "Today, 14:32",
 * "23 Nov, 09:10", or "Not yet".
 */
function lastSyncedLabel(lastSynced: number | null): string {
  if (lastSynced === null) return "Not yet";
  const day = dayOf(lastSynced);
  return `${day === todayISO() ? "Today" : fmtDayMonth(day)}, ${fmtTime(lastSynced)}`;
}

/**
 * Settings' Account group: signing in, or the signed-in address, how sync stands (the last sync,
 * and any changes still waiting for it) and signing out, which clears this device's habits and
 * asks first if changes that haven't synced would go with them.
 */
export function AccountSettings() {
  const store = useHabitStore();
  const status = useSyncStatus();
  const { push } = useNav();
  const signOutNote = useId();
  const signInButton = useRef<HTMLButtonElement>(null);

  // One sign-out at a time: a second tap while the last sync runs does nothing. Not `useSave`,
  // since a sign-out that stops to ask has gone through without signing out.
  const running = useRef(false);
  const [signingOut, setSigningOut] = useState(false);
  const [failed, setFailed] = useState(false);
  // the changes signing out would lose, as they were when asked, kept while the sheet leaves
  const [asking, setAsking] = useState<{ pending: number; open: boolean } | null>(null);
  const closeAsking = () => setAsking((a) => a && { ...a, open: false });
  useCloseWhenCovered(asking?.open ?? false, closeAsking);

  // The Sign out button goes once signed out: focus moves to Sign in, which takes its place, from
  // the button or from the question that was asked.
  const signedOutHere = useRef(false);
  useEffect(() => {
    if (status.signedIn || !signedOutHere.current) return;
    signedOutHere.current = false;
    signInButton.current?.focus();
  }, [status.signedIn]);

  const signOut = async (discardPending: boolean) => {
    if (running.current) return;
    running.current = true;
    setSigningOut(true);
    setFailed(false);
    signedOutHere.current = true;
    try {
      const result = await store.signOut({ discardPending });
      if (!result.signedOut) {
        signedOutHere.current = false;
        setAsking({ pending: result.pending, open: true });
      }
    } catch (cause) {
      // the device stays signed in, and its next sync brings back whatever was cleared
      console.error(cause);
      signedOutHere.current = false;
      setFailed(true);
    } finally {
      running.current = false;
      setSigningOut(false);
    }
  };

  const valueText = "min-w-0 truncate text-[0.9375rem] text-muted-foreground";
  return (
    <ListGroup title="Account">
      <List>
        {status.signedIn ? (
          <>
            <ListItem>
              <ListLabel className="shrink-0">Signed in as</ListLabel>
              <span className={valueText}>{status.email}</span>
            </ListItem>
            <ListItem>
              <ListLabel className="shrink-0">Last synced</ListLabel>
              <span className={valueText}>{lastSyncedLabel(status.lastSynced)}</span>
            </ListItem>
            {status.failing && (
              <ListItem>
                <ListLabel className="shrink-0">Sync</ListLabel>
                <span className={valueText}>Didn't go through, trying again</span>
              </ListItem>
            )}
            {status.pending > 0 && (
              <ListItem>
                <ListLabel className="shrink-0">Waiting to sync</ListLabel>
                <span className={valueText}>{plural(status.pending, "change")}</span>
              </ListItem>
            )}
            {/* stays focusable while the last sync runs, so focus isn't lost to the page */}
            <ListButton
              aria-describedby={signOutNote}
              aria-disabled={signingOut || undefined}
              onClick={() => void signOut(false)}
            >
              {signingOut ? "Signing out…" : "Sign out"}
              <LogOut />
            </ListButton>
          </>
        ) : (
          <ListButton ref={signInButton} onClick={() => push({ name: "sign-in" })}>
            Sign in
            <ChevronRight />
          </ListButton>
        )}
      </List>
      {status.signedIn && (
        <div className="mx-1 mt-2.5 space-y-2">
          {failed && <SaveError>Couldn't sign out. Try again.</SaveError>}
          <p id={signOutNote} className="text-[0.8125rem] text-muted-foreground">
            Signing out clears your habits from this device. Your account keeps everything that has
            synced.
          </p>
        </div>
      )}
      <SignOutDialog
        pending={asking?.pending ?? 0}
        open={asking?.open ?? false}
        onSignOut={() => {
          closeAsking();
          void signOut(true);
        }}
        onClose={closeAsking}
      />
    </ListGroup>
  );
}

/** Asks before signing out loses changes that haven't synced. */
function SignOutDialog({
  pending,
  open,
  onSignOut,
  onClose,
}: {
  /** the changes waiting to sync, which signing out would lose */
  pending: number;
  open: boolean;
  onSignOut: () => void;
  onClose: () => void;
}) {
  useBackCloses(open, onClose);
  const cancel = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      {/* starts on the safe choice, so a second Enter doesn't lose the changes */}
      <DialogContent initialFocus={cancel}>
        <DialogTitle>Sign out and lose {plural(pending, "change")}?</DialogTitle>
        <DialogDescription>
          {pending === 1 ? "It hasn't" : "They haven't"} synced to your account yet, and signing out
          clears this device. To keep {pending === 1 ? "it" : "them"}, cancel and sign out once sync
          has gone through.
        </DialogDescription>
        <DialogActions>
          <Button
            variant="destructive"
            onClick={() => {
              // a second tap while the sheet leaves does nothing
              if (open) onSignOut();
            }}
          >
            Sign out anyway
          </Button>
          <DialogClose asChild>
            <Button ref={cancel} variant="secondary">
              Cancel
            </Button>
          </DialogClose>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
