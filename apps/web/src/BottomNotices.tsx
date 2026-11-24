import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@streakky/ui/lib/utils";

/** Where the screens' notices go in the stack; null until it's in the page. */
const ScreenNoticesContext = createContext<HTMLElement | null>(null);

/**
 * The notices along the bottom of the window, in one stack so they never cover each other: a
 * screen's own notice, a goal's celebration, above the app's, the update prompt, with a gap
 * between them when both show. Kept above the home indicator, it sits under a dialog's scrim.
 * Its height is kept in `--notices-height` for the screens inside, so ScreenScroll leaves room
 * for it at the end of every screen, whatever the width and however many notices show.
 */
export function BottomNotices({
  appNotice,
  children,
}: {
  /** the app's notice, under the screens' ones */
  appNotice: ReactNode;
  /** the screens */
  children: ReactNode;
}) {
  const area = useRef<HTMLDivElement>(null);
  const stack = useRef<HTMLDivElement>(null);
  const [screenNotices, setScreenNotices] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const height = entry.borderBoxSize[0]?.blockSize ?? 0;
      area.current?.style.setProperty("--notices-height", `${height}px`);
    });
    if (stack.current) observer.observe(stack.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={area} className="contents">
      <ScreenNoticesContext.Provider value={screenNotices}>
        {children}
      </ScreenNoticesContext.Provider>
      <div
        ref={stack}
        data-slot="bottom-notices"
        className={cn(
          "pointer-events-none absolute inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-40 flex flex-col",
          // with the update prompt under it, a celebration keeps a gap above the prompt
          "[&:has([data-notice=update])_[data-notice=celebration]]:mb-2",
        )}
      >
        <div ref={setScreenNotices} />
        {appNotice}
      </div>
    </div>
  );
}

/**
 * Puts a screen's notice in the bottom stack, above the app's. Empty until the stack is in the
 * page, so `useScreenNoticesReady` tells a screen when it can show one.
 */
export function ScreenNotice({ children }: { children: ReactNode }) {
  const screenNotices = useContext(ScreenNoticesContext);
  return screenNotices && createPortal(children, screenNotices);
}

/** Whether a screen's notice is in the page yet, so what appears in it is announced. */
export function useScreenNoticesReady(): boolean {
  return useContext(ScreenNoticesContext) !== null;
}
