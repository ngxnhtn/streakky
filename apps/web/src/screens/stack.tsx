import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { prefersReducedMotion } from "@streakky/ui/lib/motion";
import { cn } from "@streakky/ui/lib/utils";

export type Route =
  | { name: "home" }
  | { name: "detail"; id: string }
  | { name: "settings" }
  | { name: "sign-in" }
  | { name: "archived" };
type Entry = { key: number; route: Route; animate: boolean };
/** The screens, Home first, and the one sliding out, if any. */
type Stack = { entries: Entry[]; leaving: number | null };

const HOME: Route = { name: "home" };

/**
 * What each browser history entry keeps: the screens open over Home. So the browser's back and
 * forward buttons and the phone's back gesture move through the screens, and a reload reopens
 * the screen it was on.
 */
type HistoryState = { screens: Route[] };

const isScreen = (route: unknown): route is Route => {
  const r = route as Partial<{ name: unknown; id: unknown }> | null;
  return (
    r?.name === "settings" ||
    r?.name === "sign-in" ||
    r?.name === "archived" ||
    (r?.name === "detail" && typeof r.id === "string")
  );
};

/** The screens a history entry keeps over Home; none for an entry this app didn't make. */
function screensOf(state: unknown): Route[] {
  const screens = (state as Partial<HistoryState> | null)?.screens;
  return Array.isArray(screens) && screens.every(isScreen) ? screens : [];
}

const sameRoute = (a: Route, b: Route) =>
  a.name === b.name && ("id" in a ? a.id : null) === ("id" in b ? b.id : null);

type Nav = { push: (route: Route) => void; pop: () => void };
const NavContext = createContext<Nav | null>(null);

/** Opens a screen over the current one, or goes back to the one below. */
export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error("useNav outside ScreenStack");
  return nav;
}

const InFrontContext = createContext(true);

/** Whether this screen is the one in front: false once another covers it or while it slides away. */
export function useInFront(): boolean {
  return useContext(InFrontContext);
}

const BelowContext = createContext<Route | null>(null);

/** The screen this one opened over, which its back button goes back to; null on Home. */
export function useScreenBelow(): Route | null {
  return useContext(BelowContext);
}

/** The screens as the person sees them: all but the one sliding out. */
const shownOf = ({ entries, leaving }: Stack) => entries.filter((e) => e.key !== leaving);

/** How long after a screen goes a new one can't open: the second tap of a quick double tap. */
const DOUBLE_TAP_MS = 400;

/** Settings sits behind the menu on the left, so it slides in from the left. */
const fromLeft = (route: Route) => route.name === "settings";

/**
 * The phone layout's screens, Home at the bottom. A pushed screen slides in over the one below,
 * and going back slides it out; under reduced motion they swap at once. Every push adds a browser
 * history entry, and the in-app back goes back through history, so both backs do the same.
 */
export function ScreenStack({ screen }: { screen: (route: Route) => ReactNode }) {
  const [stack, setStack] = useState<Stack>(() => ({
    entries: [HOME, ...screensOf(history.state)].map((route, key) => ({
      key,
      route,
      animate: false,
    })),
    leaving: null,
  }));
  const { entries, leaving } = stack;
  const nextKey = useRef(entries.length);
  // between the in-app back asking history to go back and the popstate that answers
  const goingBack = useRef(false);
  // what had focus when each screen over Home opened, to give it back when the screen goes
  const openers = useRef<(Element | null)[]>([]);
  // when a screen last went away: a double tap's second tap mustn't open what lies beneath
  const leftAt = useRef(0);

  /**
   * Shows Home with `screens` over it: screens no longer wanted go, new ones slide in.
   * Without `animate` (reduced motion, or the browser already drew its own back animation),
   * they swap at once.
   */
  const show = useCallback((screens: Route[], animate: boolean) => {
    const firstKey = nextKey.current;
    nextKey.current += screens.length + 1;
    setStack((stack) => {
      const shown = shownOf(stack);
      const wanted = [HOME, ...screens];
      let kept = 0;
      while (
        kept < shown.length &&
        kept < wanted.length &&
        sameRoute(shown[kept].route, wanted[kept])
      ) {
        kept++;
      }
      const gone = shown.slice(kept);
      const added = wanted.slice(kept).map((route, i, all) => ({
        key: firstKey + i,
        route,
        animate: animate && i === all.length - 1,
      }));
      if (gone.length === 0 && added.length === 0) return stack;
      // back by one screen slides it out; any other jump swaps at once
      if (animate && gone.length === 1 && added.length === 0) {
        return { entries: shown, leaving: gone[0].key };
      }
      return { entries: [...shown.slice(0, kept), ...added], leaving: null };
    });
  }, []);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      goingBack.current = false;
      show(screensOf(event.state), !event.hasUAVisualTransition && !prefersReducedMotion());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [show]);

  const shown = shownOf(stack);
  const screensNow = shown.slice(1).map((e) => e.route);

  // when screens go, focus goes back to what opened the one now in front, such as a habit's card
  const screenCount = useRef(screensNow.length);
  useEffect(() => {
    const count = screensNow.length;
    if (count < screenCount.current) {
      leftAt.current = performance.now();
      const opener = openers.current[count];
      openers.current.length = count;
      if (opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
    }
    screenCount.current = count;
  });
  const nav: Nav = {
    push: (route) => {
      if (leaving !== null || goingBack.current) return;
      if (performance.now() - leftAt.current < DOUBLE_TAP_MS) return;
      openers.current[screensNow.length] = document.activeElement;
      const screens = [...screensNow, route];
      history.pushState({ screens } satisfies HistoryState, "");
      show(screens, !prefersReducedMotion());
    },
    pop: () => {
      if (screensNow.length === 0 || leaving !== null || goingBack.current) return;
      const backHere = () => show(screensNow.slice(0, -1), !prefersReducedMotion());
      // Chrome ignores pushState when it's called too often, so a screen can lack its entry
      if (screensOf(history.state).length !== screensNow.length) {
        backHere();
        return;
      }
      // the popstate that follows takes the screen away, as the browser's own back does
      goingBack.current = true;
      history.back();
      // with no entry to go back to, say in a tab restored with only this one, none comes
      window.setTimeout(() => {
        if (!goingBack.current) return;
        goingBack.current = false;
        backHere();
      }, 1000);
    },
  };

  const visibleTop = entries.lastIndexOf(shown[shown.length - 1]);
  const topFromLeft = fromLeft(entries[entries.length - 1].route);

  return (
    <NavContext.Provider value={nav}>
      <div className="relative min-h-0 flex-1">
        {entries.map((entry, i) => {
          const isLeaving = entry.key === leaving;
          return (
            <section
              key={entry.key}
              inert={i !== visibleTop}
              onAnimationEnd={(event) => {
                if (event.target !== event.currentTarget) return;
                if (isLeaving) {
                  setStack((s) => ({
                    entries: s.entries.filter((other) => other.key !== entry.key),
                    leaving: s.leaving === entry.key ? null : s.leaving,
                  }));
                } else if (entry.animate) {
                  setStack((s) => ({
                    ...s,
                    entries: s.entries.map((other) =>
                      other.key === entry.key ? { ...other, animate: false } : other,
                    ),
                  }));
                }
              }}
              className={cn(
                "absolute inset-0 flex flex-col bg-background transition-[transform,background-color,translate,scale] duration-340 ease-enter",
                i < visibleTop && (topFromLeft ? "translate-x-[22%]" : "-translate-x-[22%]"),
                entry.animate &&
                  (fromLeft(entry.route) ? "animate-push-in-left" : "animate-push-in"),
                isLeaving && (fromLeft(entry.route) ? "animate-push-out-left" : "animate-push-out"),
                (entry.animate || isLeaving) && "shadow-[0_0_2.5rem_rgb(0_0_0/0.12)]",
              )}
            >
              <InFrontContext.Provider value={i === visibleTop}>
                <BelowContext.Provider value={entries[i - 1]?.route ?? null}>
                  {screen(entry.route)}
                </BelowContext.Provider>
              </InFrontContext.Provider>
            </section>
          );
        })}
      </div>
    </NavContext.Provider>
  );
}

/**
 * A screen's scrolling body under its app bar. Its end leaves room for the home indicator, and
 * more while BottomNotices shows notices taller than that, so scrolled to the end nothing is
 * left under them.
 */
export function ScreenScroll({ children }: { children: ReactNode }) {
  return (
    <main
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        // the notices' height, their offset from the bottom and a gap above them
        "pb-[max(4.5rem,calc(var(--notices-height,0rem)_+_max(0.5rem,env(safe-area-inset-bottom))_+_0.5rem))]",
      )}
    >
      {children}
    </main>
  );
}

/**
 * While `open`, a dialog has its own browser history entry, so the browser's back button and the
 * phone's back gesture close the dialog before they leave the screen. Closing it in the app
 * (a button, Escape, the scrim) takes the entry away again, so history doesn't fill up.
 */
export function useBackCloses(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const id = crypto.randomUUID();
    const dialogOf = (state: unknown) => (state as { dialog?: string } | null)?.dialog;
    // the same screens as now, so the screen stack sees no change on either side of it
    history.pushState({ ...(history.state as object | null), dialog: id }, "");
    let popped = false;
    const onPopState = (event: PopStateEvent) => {
      if (dialogOf(event.state) === id) return;
      popped = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (!popped && dialogOf(history.state) === id) history.back();
    };
  }, [open]);
}
