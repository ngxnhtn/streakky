import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { prefersReducedMotion } from "@streakky/ui/hooks/use-tween";
import { cn } from "@streakky/ui/lib/utils";

export type Route = { name: "home" } | { name: "detail"; id: string } | { name: "settings" };
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
  return r?.name === "settings" || (r?.name === "detail" && typeof r.id === "string");
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

/** The screens as the person sees them: all but the one sliding out. */
const shownOf = ({ entries, leaving }: Stack) => entries.filter((e) => e.key !== leaving);

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
  const nav: Nav = {
    push: (route) => {
      if (leaving !== null || goingBack.current) return;
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
                {screen(entry.route)}
              </InFrontContext.Provider>
            </section>
          );
        })}
      </div>
    </NavContext.Provider>
  );
}

/** A screen's scrolling body under its app bar, with room left for the home indicator. */
export function ScreenScroll({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[4.5rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </main>
  );
}
