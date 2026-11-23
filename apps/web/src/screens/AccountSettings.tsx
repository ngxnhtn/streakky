import { ChevronRight, LogOut } from "lucide-react";
import { List, ListButton, ListGroup, ListItem, ListLabel } from "@streakky/ui/components/list";
import { useHabitStore, useSyncStatus } from "../store/react.tsx";
import { useNav } from "./stack.tsx";

/** Settings' Account group: signing in, or the signed-in address and signing out. */
export function AccountSettings() {
  const store = useHabitStore();
  const status = useSyncStatus();
  const { push } = useNav();
  return (
    <ListGroup title="Account">
      <List>
        {status.signedIn ? (
          <>
            <ListItem>
              <ListLabel className="shrink-0">Signed in as</ListLabel>
              <span className="min-w-0 truncate text-[0.9375rem] text-muted-foreground">
                {status.email}
              </span>
            </ListItem>
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
