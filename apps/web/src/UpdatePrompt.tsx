import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { Button } from "@streakky/ui/components/button";
import { cn } from "@streakky/ui/lib/utils";
import { readyUpdate, subscribeToUpdates, type Update } from "./service-worker.ts";

/** Small buttons, but full 2.75rem tap targets. */
const actionClasses = "h-11";

/**
 * A one-line notice along the bottom of the window once a new version is ready: Reload switches
 * to it, Not now hides it until the app is opened again or comes back from the background. It
 * never takes focus, and it sits under the scrim of an open dialog, so whatever is being typed
 * there stays put until the person chooses. It is the app's notice in BottomNotices, under a
 * screen's own, such as a goal's celebration.
 */
export function UpdatePrompt() {
  const update = useSyncExternalStore(subscribeToUpdates, readyUpdate);
  // the update the person said "Not now" to; a newer one shows the notice again
  const [dismissed, setDismissed] = useState<Update | null>(null);
  const messageId = useId();
  // coming back to the app (a phone app resumed, a tab shown again) offers a waiting update again
  useEffect(() => {
    const offerAgain = () => {
      if (document.visibilityState === "visible") setDismissed(null);
    };
    document.addEventListener("visibilitychange", offerAgain);
    return () => document.removeEventListener("visibilitychange", offerAgain);
  }, []);
  const shown = update !== null && update !== dismissed;
  return (
    // always in the page, so screen readers announce what appears in it; the explicit aria-live
    // also keeps a modal dialog from hiding it while one is open
    <div role="status" aria-live="polite" className="flex justify-center">
      {shown && (
        <div
          data-notice="update"
          className="pointer-events-auto flex w-full max-w-[26rem] animate-rise flex-wrap items-center gap-x-2 rounded-[1.75rem] border border-border bg-popover p-2 pl-5 text-popover-foreground shadow-[0_0.5rem_2rem_rgb(0_0_0/0.14)]"
        >
          <p id={messageId} className="min-w-[6rem] flex-1 py-1 leading-tight font-medium">
            A new version is ready.
          </p>
          <div className="ml-auto flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(actionClasses, "px-3")}
              // a function given to a state setter is called as an updater, so wrap the update
              onClick={() => setDismissed(() => update)}
            >
              Not now
            </Button>
            <Button
              size="sm"
              className={cn(actionClasses, "px-4")}
              aria-describedby={messageId}
              onClick={() => update()}
            >
              Reload
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
