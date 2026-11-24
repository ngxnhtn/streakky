import { ChevronRight, LogOut } from "lucide-react";
import { fmtDayMonth, plural, toISO, todayISO } from "@streakky/core";
import { List, ListButton, ListGroup, ListItem, ListLabel } from "@streakky/ui/components/list";
import { useHabitStore, useSyncStatus } from "../store/react.tsx";
import { useNav } from "./stack.tsx";

const timeOfDay = new Intl.DateTimeFormat("en-GB", { timeStyle: "short" });

/** When this device last synced, in words: "Today, 14:32", "23 Nov, 09:10", or "Not yet". */
function lastSyncedLabel(lastSynced: number | null): string {
  if (lastSynced === null) return "Not yet";
  const at = new Date(lastSynced);
  const day = toISO(at) === todayISO() ? "Today" : fmtDayMonth(at);
  return `${day}, ${timeOfDay.format(at)}`;
}

/**
 * Settings' Account group: signing in, or the signed-in address, how sync stands (the last sync,
 * and any changes still waiting for it) and signing out.
 */
export function AccountSettings() {
  const store = useHabitStore();
  const status = useSyncStatus();
  const { push } = useNav();
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
            <ListButton onClick={() => void store.signOut()}>
              Sign out
              <LogOut />
            </ListButton>
          </>
        ) : (
          <ListButton onClick={() => push({ name: "sign-in" })}>
            Sign in
            <ChevronRight />
          </ListButton>
        )}
      </List>
    </ListGroup>
  );
}
