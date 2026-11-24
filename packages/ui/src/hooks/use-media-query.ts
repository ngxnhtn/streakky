import { useCallback, useSyncExternalStore } from "react";
import { matchesMedia } from "@streakky/ui/lib/media";

/** Whether a media query matches; the component re-renders when that changes. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (changed: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", changed);
      return () => list.removeEventListener("change", changed);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => matchesMedia(query),
    () => false,
  );
}
