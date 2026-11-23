import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { PortalContainerProvider } from "@streakky/ui/components/portal";
import { prefersReducedMotion } from "@streakky/ui/hooks/use-tween";
import { cn } from "@streakky/ui/lib/utils";
import { ShapeContext } from "../parts/shape.tsx";
import { Detail } from "./Detail.tsx";
import { Home } from "./Home.tsx";
import { Settings } from "./Settings.tsx";

export type Route = { name: "home" } | { name: "detail"; id: string } | { name: "settings" };
type Entry = { key: number; route: Route; animate: boolean };

type Nav = { push: (r: Route) => void; pop: () => void };
const NavCtx = createContext<Nav | null>(null);
export function useNav(): Nav {
  const n = useContext(NavCtx);
  if (!n) throw new Error("useNav outside App");
  return n;
}

/** Settings sits behind the menu on the left, so it slides in from the left. */
const fromLeft = (r: Route) => r.name === "settings";

/** The phone app: a stack of screens that slide in and out. Dialogs open inside it. */
export function App({ initial, framed }: { initial: Route[]; framed: boolean }) {
  const seq = useRef(initial.length);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [stack, setStack] = useState<Entry[]>(() =>
    initial.map((route, key) => ({ key, route, animate: false })),
  );
  const [leaving, setLeaving] = useState<number | null>(null);

  const nav: Nav = {
    push: (route) => {
      if (leaving !== null) return;
      setStack((s) => [...s, { key: seq.current++, route, animate: !prefersReducedMotion() }]);
    },
    pop: () => {
      if (stack.length < 2 || leaving !== null) return;
      const top = stack[stack.length - 1];
      if (prefersReducedMotion()) setStack((s) => s.slice(0, -1));
      else setLeaving(top.key);
    },
  };

  const visibleTop = stack.findLastIndex((e) => e.key !== leaving);
  const topLeft = fromLeft(stack[stack.length - 1].route);

  return (
    <NavCtx.Provider value={nav}>
      <ShapeContext.Provider
        value={{ shape: "sheet", className: framed ? "bottom-[22px] rounded-[40px]" : undefined }}
      >
        <PortalContainerProvider container={root}>
          <div
            ref={setRoot}
            className="relative flex h-full flex-col overflow-hidden bg-background text-[15px] leading-[1.4] text-foreground transition-colors duration-300"
          >
            {framed && <StatusBar />}
            <div className="relative min-h-0 flex-1">
              {stack.map((e, i) => {
                const isLeaving = e.key === leaving;
                const under = i < visibleTop;
                return (
                  <section
                    key={e.key}
                    inert={i !== visibleTop}
                    onAnimationEnd={(ev) => {
                      if (ev.target !== ev.currentTarget) return;
                      if (isLeaving) {
                        setStack((s) => s.filter((x) => x.key !== e.key));
                        setLeaving(null);
                      } else if (e.animate) {
                        setStack((s) =>
                          s.map((x) => (x.key === e.key ? { ...x, animate: false } : x)),
                        );
                      }
                    }}
                    className={cn(
                      "absolute inset-0 flex flex-col bg-background transition-[transform,background-color,translate,scale] duration-340 ease-enter",
                      under && (topLeft ? "translate-x-[22%]" : "-translate-x-[22%]"),
                      e.animate && (fromLeft(e.route) ? "animate-push-in-left" : "animate-push-in"),
                      isLeaving &&
                        (fromLeft(e.route) ? "animate-push-out-left" : "animate-push-out"),
                      (e.animate || isLeaving) && "shadow-[0_0_40px_rgb(0_0_0/0.12)]",
                    )}
                  >
                    <Screen route={e.route} />
                  </section>
                );
              })}
            </div>
            {framed && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-2 left-1/2 z-40 h-[5px] w-[136px] -translate-x-1/2 rounded-full bg-foreground/85"
              />
            )}
          </div>
        </PortalContainerProvider>
      </ShapeContext.Provider>
    </NavCtx.Provider>
  );
}

function Screen({ route }: { route: Route }): ReactNode {
  switch (route.name) {
    case "home":
      return <Home />;
    case "detail":
      return <Detail id={route.id} />;
    case "settings":
      return <Settings />;
  }
}

/** Scrolls under the app bar; leaves room for the home indicator. */
export function ScreenScroll({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[72px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  );
}

function StatusBar() {
  return (
    <div
      aria-hidden="true"
      className="flex h-[54px] flex-none items-center justify-between pt-3.5 pr-[34px] pl-[46px] text-base font-semibold tracking-[-0.01em]"
    >
      <span>9:41</span>
      <svg width="68" height="12" viewBox="0 0 68 12" fill="currentColor">
        <rect x="0" y="8" width="3" height="4" rx="1" />
        <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
        <rect x="10" y="3" width="3" height="9" rx="1" />
        <rect x="15" y="0.5" width="3" height="11.5" rx="1" />
        <path d="M30.5 3.2a8.6 8.6 0 0 1 11 0l-1.3 1.4a6.7 6.7 0 0 0-8.4 0zM33 5.9a5 5 0 0 1 6 0l-1.3 1.4a3.1 3.1 0 0 0-3.4 0zM36 8.3l1.6 1.8L36 11.8l-1.6-1.7z" />
        <rect
          x="46.5"
          y="0.75"
          width="19"
          height="10.5"
          rx="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity=".45"
        />
        <rect x="48.5" y="2.75" width="13" height="6.5" rx="1.5" />
        <rect x="66.5" y="4" width="1.5" height="4" rx=".75" opacity=".45" />
      </svg>
    </div>
  );
}
