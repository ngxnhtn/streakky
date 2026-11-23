import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { prefersReducedMotion } from "@streakky/ui/hooks/use-tween";
import { cn } from "@streakky/ui/lib/utils";

export type Route = { name: "home" } | { name: "settings" };
type Entry = { key: number; route: Route; animate: boolean };

type Nav = { push: (route: Route) => void; pop: () => void };
const NavContext = createContext<Nav | null>(null);

/** Opens a screen over the current one, or goes back to the one below. */
export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error("useNav outside ScreenStack");
  return nav;
}

/** Settings sits behind the menu on the left, so it slides in from the left. */
const fromLeft = (route: Route) => route.name === "settings";

/**
 * The phone layout's screens, Home at the bottom. A pushed screen slides in over the one below,
 * and going back slides it out; under reduced motion they swap at once.
 */
export function ScreenStack({ screen }: { screen: (route: Route) => ReactNode }) {
  const nextKey = useRef(1);
  const [stack, setStack] = useState<Entry[]>([
    { key: 0, route: { name: "home" }, animate: false },
  ]);
  const [leaving, setLeaving] = useState<number | null>(null);

  const nav: Nav = {
    push: (route) => {
      if (leaving !== null) return;
      setStack((s) => [...s, { key: nextKey.current++, route, animate: !prefersReducedMotion() }]);
    },
    pop: () => {
      if (stack.length < 2 || leaving !== null) return;
      const top = stack[stack.length - 1];
      if (prefersReducedMotion()) setStack((s) => s.slice(0, -1));
      else setLeaving(top.key);
    },
  };

  const visibleTop = stack.findLastIndex((e) => e.key !== leaving);
  const topFromLeft = fromLeft(stack[stack.length - 1].route);

  return (
    <NavContext.Provider value={nav}>
      <div className="relative min-h-0 flex-1">
        {stack.map((entry, i) => {
          const isLeaving = entry.key === leaving;
          return (
            <section
              key={entry.key}
              inert={i !== visibleTop}
              onAnimationEnd={(event) => {
                if (event.target !== event.currentTarget) return;
                if (isLeaving) {
                  setStack((s) => s.filter((other) => other.key !== entry.key));
                  setLeaving(null);
                } else if (entry.animate) {
                  setStack((s) =>
                    s.map((other) =>
                      other.key === entry.key ? { ...other, animate: false } : other,
                    ),
                  );
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
              {screen(entry.route)}
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
