import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@streakky/ui/components/button";
import { prefersReducedMotion } from "@streakky/ui/lib/motion";
import { cn } from "@streakky/ui/lib/utils";
import type { Platform } from "../platform.ts";
import { useDesktop } from "./desktop.tsx";

export type Route =
  | { name: "home" }
  | { name: "detail"; id: string }
  | { name: "settings" }
  /** with the address a code went to once it's sent, so a reload stays on the code step */
  | { name: "sign-in"; email?: string }
  | { name: "archived" };

type RouteName = Route["name"];
type RouteOf<N extends RouteName> = Extract<Route, { name: N }>;

/**
 * Every screen by its route's name: what it shows and how it comes and goes. It must have an entry
 * for each name in `Route`, and none other, so a new route doesn't type-check until it has one.
 */
export type RouteTable = {
  [N in RouteName]: {
    screen: (route: RouteOf<N>) => ReactNode;
    /** what a back button on a screen opened over this one says, such as "Back to settings" */
    backLabel: string;
    /** Settings sits behind the menu on the left, so it slides in from the left */
    fromLeft?: boolean;
    /** the desktop sidebar opens it straight over Home, as one of its pages */
    sidebarPage?: boolean;
    /** whether a route read back from history carries what the screen needs, beyond its name */
    valid?: (route: Record<string, unknown>) => boolean;
  };
};

type Entry = { key: number; route: Route; animate: boolean };
/** The screens, Home first, and the one sliding out, if any. */
type Stack = { entries: Entry[]; leaving: number | null };

const HOME: Route = { name: "home" };

/**
 * What each browser history entry keeps: the screens open over Home, so the browser's back and
 * forward buttons and the phone's back gesture move through the screens, and a reload reopens
 * the screen it was on. `at` counts the entries the app has added before it, so a popstate tells
 * back from forward. A sheet's entry (`useBackCloses`) also names the sheet.
 */
type HistoryState = { screens: Route[]; at?: number; dialog?: string };

const atOf = (state: unknown) => {
  const at = (state as Partial<HistoryState> | null)?.at;
  return typeof at === "number" ? at : 0;
};
const sheetOf = (state: unknown) => {
  const dialog = (state as Partial<HistoryState> | null)?.dialog;
  return typeof dialog === "string" ? dialog : undefined;
};

/** Whether two routes show the same screen. */
export const sameRoute = (a: Route, b: Route) =>
  a.name === b.name && ("id" in a ? a.id : null) === ("id" in b ? b.id : null);
const sameScreens = (a: Route[], b: Route[]) =>
  a.length === b.length && a.every((route, i) => sameRoute(route, b[i]));

/** Whether a route read back from history is a screen over Home that the table knows. */
function isScreen(routes: RouteTable, route: unknown): route is Route {
  if (typeof route !== "object" || route === null) return false;
  const { name } = route as { name?: unknown };
  if (typeof name !== "string" || name === "home" || !Object.hasOwn(routes, name)) return false;
  return routes[name as RouteName].valid?.(route as Record<string, unknown>) ?? true;
}

/** The screens a history entry keeps over Home; none for an entry this app didn't make. */
function screensOf(routes: RouteTable, state: unknown): Route[] {
  const screens = (state as Partial<HistoryState> | null)?.screens;
  return Array.isArray(screens) && screens.every((route) => isScreen(routes, route)) ? screens : [];
}

/** Shows a route's screen. The table pairs each name with its own route, which TypeScript can't follow here. */
const screenOf = (routes: RouteTable, route: Route) =>
  (routes[route.name].screen as (route: Route) => ReactNode)(route);

type Nav = {
  /** opens a screen over the one in front */
  push: (route: Route) => void;
  /** goes back to the screen below, through history as the browser's back does */
  pop: () => void;
  /** changes the route of the screen in front, in its history entry too, without a new entry */
  replace: (route: Route) => void;
  /**
   * Shows `route` alone over Home, or Home itself, as a new history entry: the desktop sidebar's
   * way between its pages. Does nothing if that's what shows already.
   */
  go: (route: Route) => void;
};
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

/**
 * Closes something a screen opened, such as a sheet or a notice, once another screen covers this
 * one or this one goes, say by the browser's forward button.
 */
export function useCloseWhenCovered(open: boolean, close: () => void) {
  const inFront = useInFront();
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (open && !inFront) closeRef.current();
  }, [open, inFront]);
}

const ShownContext = createContext<{ screens: Route[]; frontKey: number }>({
  screens: [],
  frontKey: 0,
});

/**
 * The screens shown over Home, as the sidebar marks its page from the first, and a key for the
 * one in front, which changes whenever another comes in front.
 */
export const useShownScreens = () => useContext(ShownContext);

const SidebarPageContext = createContext(false);

/**
 * Whether this screen is one of the desktop sidebar's pages, straight over Home, such as Settings
 * or a habit: the sidebar is its way back. Archived habits opened from Home isn't one.
 */
export const useSidebarPage = () => useContext(SidebarPageContext);

const BelowContext = createContext<Route | null>(null);

/** The screen this one opened over, which its back button goes back to; null on Home. */
export function useScreenBelow(): Route | null {
  return useContext(BelowContext);
}

const RoutesContext = createContext<RouteTable | null>(null);

/**
 * The back arrow, named after the screen it goes back to, such as "Back to settings": alone in the
 * phone's app bar, or with that name beside it (`labelled`) over a desktop page's heading.
 */
export function BackButton({ labelled = false }: { labelled?: boolean }) {
  const { pop } = useNav();
  const below = useScreenBelow();
  const routes = useContext(RoutesContext);
  const label = below && routes ? routes[below.name].backLabel : "Back";
  return labelled ? (
    <Button variant="ghost" size="sm" className="gap-1 pl-2" onClick={pop}>
      <ChevronLeft strokeWidth={1.75} />
      {label}
    </Button>
  ) : (
    <Button variant="ghost" size="icon" aria-label={label} onClick={pop}>
      <ChevronLeft strokeWidth={1.75} />
    </Button>
  );
}

/** The history entries the app adds, for `useBackCloses`. */
type HistoryEntries = {
  /** adds an entry after the one the app is on, and moves to it */
  push: (state: HistoryState) => void;
  /** the sheets whose entries the app is on or leaving, by the id their entries carry */
  sheets: Set<string>;
};
const HistoryContext = createContext<HistoryEntries | null>(null);

/** The screens as the person sees them: all but the one sliding out. */
const shownOf = ({ entries, leaving }: Stack) => entries.filter((e) => e.key !== leaving);

/** How long after a screen goes a new one can't open: the second tap of a quick double tap. */
const DOUBLE_TAP_MS = 400;

/**
 * The app's screens, Home at the bottom. In the phone layout a pushed screen slides in over the
 * one below, and going back slides it out; under reduced motion they swap at once. In the desktop
 * layout the screen in front is the page beside `aside`, the sidebar, and screens swap at once.
 * The screens beneath stay in the page either way, hidden, so switching layouts as the window is
 * resized keeps every screen and what was typed into it.
 *
 * Every push adds a browser history entry, and the in-app back goes back through history, so both
 * backs do the same. Focus moves to a screen's heading as it comes in front, and back to what
 * opened it as it goes.
 */
export function ScreenStack({
  routes,
  aside,
  backButton,
  links,
  children,
}: {
  routes: RouteTable;
  /** the desktop layout's sidebar, beside the screen in front */
  aside: ReactNode;
  /** Android's back button; none on the web, where the browser's back does it */
  backButton: Platform["backButton"];
  /**
   * Screens opened from outside the app, such as a habit from its widget: calls `show` with each,
   * which shows it alone over Home, as the desktop sidebar's pages are; returns a function that stops.
   */
  links?: (show: (route: Route) => void) => () => void;
  /** what lies over every screen, such as a dialog any of them opens */
  children: ReactNode;
}) {
  const desktop = useDesktop();
  const desktopNow = useRef(desktop);
  desktopNow.current = desktop;
  /** Whether screens slide: in the phone layout, unless motion is reduced. */
  const slides = () => !desktopNow.current && !prefersReducedMotion();
  const [stack, setStack] = useState<Stack>(() => ({
    entries: [HOME, ...screensOf(routes, history.state)].map((route, key) => ({
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
  const sections = useRef<HTMLDivElement>(null);

  // the state of the history entry the app is on, to tell what a popstate left
  const here = useRef<unknown>(history.state);
  // the screens of each history entry the app has been on this time, by its `at`, to tell whether
  // going back would show the screen beneath
  const [entryScreens] = useState(
    () => new Map([[atOf(history.state), screensOf(routes, history.state)]]),
  );
  const [historyEntries] = useState<HistoryEntries>(() => ({
    push: (state) => {
      const next: HistoryState = { ...state, at: atOf(here.current) + 1 };
      history.pushState(next, "");
      here.current = next;
      entryScreens.set(next.at ?? 0, next.screens);
    },
    sheets: new Set(),
  }));

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

  const shown = shownOf(stack);
  const screensNow = shown.slice(1).map((e) => e.route);
  const shownScreens = useRef(screensNow);
  shownScreens.current = screensNow;

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const left = here.current;
      here.current = event.state;
      const screens = screensOf(routes, event.state);
      entryScreens.set(atOf(event.state), screens);
      const step = Math.sign(atOf(event.state) - atOf(left));
      // an open sheet's entry going, by the browser's back or the sheet closing itself, closes it
      const leftSheet = sheetOf(left);
      const closedSheet = leftSheet !== undefined && historyEntries.sheets.delete(leftSheet);
      // The entry of a sheet that is no longer open, such as one open when the page was
      // reloaded, holds the same screens as the entry before it. Such entries are passed over,
      // the way the person was going, so every back and forward shows a change.
      if (!closedSheet && sameScreens(screens, shownScreens.current)) {
        if (step < 0 || (step > 0 && sheetOf(event.state) !== undefined)) {
          history.go(step);
          return;
        }
      }
      goingBack.current = false;
      show(screens, !event.hasUAVisualTransition && slides());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [show, historyEntries, routes]);

  const visibleTop = entries.lastIndexOf(shown[shown.length - 1]);

  // When a screen comes in front, focus goes to its heading, so a screen reader starts there and
  // Tab goes on from it, unless the screen took focus itself, as Sign in's email field does. When
  // screens go, focus goes back to what opened the one now in front, such as a habit's card.
  const topKey = shown[shown.length - 1].key;
  const screenCount = useRef(screensNow.length);
  const shownTop = useRef(topKey);
  useEffect(() => {
    const count = screensNow.length;
    const front = sections.current?.children[visibleTop];
    // the heading takes focus with tabIndex -1; on a screen without one, its first button does
    const focusHeading = () => {
      if (!(front instanceof HTMLElement) || front.contains(document.activeElement)) return;
      const heading = front.querySelector("h1[tabindex]") ?? front.querySelector("button");
      if (heading instanceof HTMLElement) heading.focus({ preventScroll: true });
    };
    if (count < screenCount.current) {
      leftAt.current = performance.now();
      const opener = openers.current[count];
      openers.current.length = count;
      // after a reload, or once the opener has gone, the screen's heading
      if (opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
      else focusHeading();
    } else if (topKey !== shownTop.current) {
      focusHeading();
    }
    screenCount.current = count;
    shownTop.current = topKey;
  });

  /** Changes the screens of the history entry the app is on, without a new one. */
  const replaceEntry = (screens: Route[]) => {
    const next: HistoryState = { ...(history.state as HistoryState), screens };
    history.replaceState(next, "");
    here.current = next;
    entryScreens.set(atOf(next), screens);
  };

  const nav: Nav = {
    push: (route) => {
      if (leaving !== null || goingBack.current) return;
      if (performance.now() - leftAt.current < DOUBLE_TAP_MS) return;
      openers.current[screensNow.length] = document.activeElement;
      const screens = [...screensNow, route];
      historyEntries.push({ screens });
      show(screens, slides());
    },
    pop: () => {
      if (screensNow.length === 0 || leaving !== null || goingBack.current) return;
      const beneath = screensNow.slice(0, -1);
      const backHere = () => show(beneath, slides());
      // Chrome ignores pushState when it's called too often, so a screen can lack its entry
      if (screensOf(routes, history.state).length !== screensNow.length) {
        backHere();
        return;
      }
      // After moving between the desktop sidebar's pages, the entry before is the page left, not
      // the screen beneath. Going up then takes this entry's place, rather than going back.
      const before = entryScreens.get(atOf(here.current) - 1);
      if (before !== undefined && !sameScreens(before, beneath)) {
        replaceEntry(beneath);
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
    replace: (route) => {
      const top = shown[shown.length - 1];
      if (shown.length < 2) return;
      const screens = [...screensNow.slice(0, -1), route];
      if (screensOf(routes, history.state).length === screensNow.length) replaceEntry(screens);
      setStack((s) => ({
        ...s,
        entries: s.entries.map((e) => (e.key === top.key ? { ...e, route } : e)),
      }));
    },
    go: (route) => {
      const screens = route.name === "home" ? [] : [route];
      if (leaving !== null || goingBack.current || sameScreens(screens, screensNow)) return;
      // focus goes to the new page's heading, not back to the sidebar
      openers.current = [];
      historyEntries.push({ screens });
      show(screens, false);
    },
  };

  // The back button closes an open sheet, whose history entry the app is on, or goes back a
  // screen, as the in-app back does. On Home with nothing open, it has nothing to go back to.
  const backNow = useRef<() => boolean>(() => false);
  backNow.current = () => {
    if (sheetOf(here.current) !== undefined) history.back();
    else if (screensNow.length > 0) nav.pop();
    else return false;
    return true;
  };
  useEffect(() => backButton?.(() => backNow.current()), [backButton]);

  const showNow = useRef(nav.go);
  showNow.current = nav.go;
  useEffect(() => links?.((route) => showNow.current(route)), [links]);

  // Screens don't slide on the desktop: one sliding as the window is resized past the phone
  // layout goes at once, and one that slid in doesn't slide in again on the way back.
  useEffect(() => {
    if (!desktop) return;
    setStack((s) =>
      s.leaving === null && s.entries.every((e) => !e.animate)
        ? s
        : {
            entries: s.entries
              .filter((e) => e.key !== s.leaving)
              .map((e) => (e.animate ? { ...e, animate: false } : e)),
            leaving: null,
          },
    );
  }, [desktop]);

  const topFromLeft = routes[entries[entries.length - 1].route.name].fromLeft === true;

  return (
    <NavContext.Provider value={nav}>
      <RoutesContext.Provider value={routes}>
        <HistoryContext.Provider value={historyEntries}>
          <ShownContext.Provider value={{ screens: screensNow, frontKey: topKey }}>
            {/* The same elements in both layouts, the sidebar's place held while it's away, so
                switching keeps every screen as it is. The sidebar comes first, as it's drawn. */}
            <div
              className={cn(
                desktop
                  ? "grid min-h-0 flex-1 grid-cols-[17rem_minmax(0,1fr)] max-[56.25rem]:grid-cols-[14rem_minmax(0,1fr)]"
                  : "contents",
              )}
            >
              {desktop ? (
                <aside className="flex min-h-0 flex-col overflow-y-auto border-r border-border">
                  {aside}
                </aside>
              ) : null}
              <div ref={sections} className="relative min-h-0 flex-1">
                {entries.map((entry, i) => {
                  const isLeaving = entry.key === leaving;
                  const fromLeft = routes[entry.route.name].fromLeft === true;
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
                        "absolute inset-0 flex flex-col bg-background",
                        desktop
                          ? i !== visibleTop && "hidden"
                          : [
                              "transition-[transform,background-color,translate,scale] duration-340 ease-enter",
                              i < visibleTop &&
                                (topFromLeft ? "translate-x-[22%]" : "-translate-x-[22%]"),
                              entry.animate &&
                                (fromLeft ? "animate-push-in-left" : "animate-push-in"),
                              isLeaving &&
                                (fromLeft ? "animate-push-out-left" : "animate-push-out"),
                              (entry.animate || isLeaving) && "shadow-[0_0_2.5rem_rgb(0_0_0/0.12)]",
                            ],
                      )}
                    >
                      <InFrontContext.Provider value={i === visibleTop}>
                        <SidebarPageContext.Provider
                          value={i === 1 && routes[entry.route.name].sidebarPage === true}
                        >
                          <BelowContext.Provider value={entries[i - 1]?.route ?? null}>
                            {screenOf(routes, entry.route)}
                          </BelowContext.Provider>
                        </SidebarPageContext.Provider>
                      </InFrontContext.Provider>
                    </section>
                  );
                })}
              </div>
              {children}
            </div>
          </ShownContext.Provider>
        </HistoryContext.Provider>
      </RoutesContext.Provider>
    </NavContext.Provider>
  );
}

/**
 * While `open`, a dialog has its own browser history entry, so the browser's back button and the
 * phone's back gesture close the dialog before they leave the screen. Closing it in the app
 * (a button, Escape, the scrim) takes the entry away again, so history doesn't fill up.
 */
export function useBackCloses(open: boolean, close: () => void) {
  const entries = useContext(HistoryContext);
  if (!entries) throw new Error("useBackCloses outside ScreenStack");
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const id = crypto.randomUUID();
    // the same screens as now, so the screen stack sees no change on either side of it
    entries.sheets.add(id);
    entries.push({ ...(history.state as HistoryState), dialog: id });
    let popped = false;
    const onPopState = (event: PopStateEvent) => {
      if (sheetOf(event.state) === id) return;
      popped = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      // the stack forgets the sheet once it sees its entry go
      if (!popped && sheetOf(history.state) === id) history.back();
      else entries.sheets.delete(id);
    };
  }, [open, entries]);
}
