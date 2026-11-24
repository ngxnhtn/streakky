import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { PartyPopper, X } from "lucide-react";
import type { Habit } from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import { prefersReducedMotion } from "@streakky/ui/hooks/use-tween";
import { cn } from "@streakky/ui/lib/utils";
import { useHabitStore, useSettings } from "../store/react.tsx";
import { useInFront } from "./stack.tsx";

/** How long the notice stays when nothing holds it. */
const SHOWN_MS = 6000;

/**
 * A goal's celebration, for the habits this screen shows, while it is the screen in front: for a
 * build habit on the check-in that reaches its goal, for a quit habit the first time it is shown
 * on or after the day it does. Each plays once per streak and goal on this device, one at a time.
 * With Celebrations off in Settings, they pass without playing. `day` is today, so a quit habit
 * reaching its goal at midnight plays then. The screen renders the result once.
 */
export function useCelebration(habits: Habit[], day: string): ReactNode {
  const store = useHabitStore();
  const { celebrate } = useSettings();
  const inFront = useInFront();
  const [playing, setPlaying] = useState<Habit | null>(null);
  useEffect(() => {
    if (!inFront || playing) return;
    for (const habit of habits) {
      if (!store.celebrationDue(habit)) continue;
      store.markCelebrated(habit);
      if (celebrate) {
        setPlaying(habit);
        return;
      }
    }
  }, [store, habits, day, inFront, playing, celebrate]);
  return (
    // always in the page, so screen readers announce what appears in it
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-30 flex justify-center"
    >
      {playing && <GoalReached habit={playing} onDone={() => setPlaying(null)} />}
    </div>
  );
}

/**
 * A notice along the bottom with a burst of the habit's colour rising from it. It leaves by itself
 * unless a pointer or focus is on it, never takes focus, and under reduced motion it has no burst.
 * Dismissed from the keyboard, it gives focus back to where it came from.
 */
function GoalReached({ habit, onDone }: { habit: Habit; onDone: () => void }) {
  const [held, setHeld] = useState(false);
  const notice = useRef<HTMLDivElement>(null);
  const cameFrom = useRef<HTMLElement | null>(null);
  const leave = useRef(onDone);
  leave.current = () => {
    const from = cameFrom.current;
    if (notice.current?.contains(document.activeElement) && from?.isConnected) from.focus();
    onDone();
  };
  useEffect(() => {
    if (held) return;
    const timer = window.setTimeout(() => leave.current(), SHOWN_MS);
    return () => window.clearTimeout(timer);
  }, [held]);
  const burst = useMemo(() => !prefersReducedMotion(), []);
  return (
    <div
      ref={notice}
      data-habit-color={habit.color}
      className="pointer-events-auto relative w-full max-w-[26rem]"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={(event) => {
        setHeld(true);
        const from = event.relatedTarget;
        if (from instanceof HTMLElement && !notice.current?.contains(from)) cameFrom.current = from;
      }}
      onBlur={() => setHeld(false)}
    >
      {burst && <Burst />}
      <div className="relative flex animate-rise items-center gap-3 rounded-[1.75rem] border border-border bg-popover p-2 text-popover-foreground shadow-[0_0.5rem_2rem_rgb(0_0_0/0.14)]">
        <span
          aria-hidden="true"
          className="grid size-11 flex-none animate-tick-pop place-items-center rounded-full bg-habit text-habit-foreground"
        >
          <PartyPopper strokeWidth={1.75} className="size-5" />
        </span>
        <p className="min-w-0 flex-1 py-1 leading-tight">
          <span className="block font-medium">{habit.goal}-day goal reached</span>
          <span className="sr-only">: </span>
          <span className="mt-0.5 block truncate text-[0.875rem] text-muted-foreground">
            {habit.name}
          </span>
        </p>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Dismiss the celebration"
          onClick={() => leave.current()}
        >
          <X strokeWidth={1.75} />
        </Button>
      </div>
    </div>
  );
}

const PIECES = 28;
const SHAPES = [
  "h-3 w-1.5 rounded-[0.125rem] bg-habit",
  "size-2 rounded-full bg-habit/45",
  "size-2.5 rounded-full border-2 border-habit",
  "size-2 rounded-[0.125rem] bg-habit",
];

/** Pieces of the habit's colour thrown up from the notice's top edge, falling away as they fade. */
function Burst() {
  const pieces = useMemo(() => {
    // the same scatter every time: a small fixed sequence instead of Math.random
    let seed = 7;
    const next = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    return Array.from({ length: PIECES }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      // wider throws stay lower, so the pieces fan out from the middle
      const out = next();
      return {
        shape: SHAPES[i % SHAPES.length],
        style: {
          "--x": `${side * out * 10.5}rem`,
          "--y": `${-(6 + (1 - out) * 7 + next() * 5)}rem`,
          "--fall": `${6 + next() * 6}rem`,
          "--turn": `${side * (180 + next() * 360)}deg`,
          animationDelay: `${Math.round(next() * 140)}ms`,
          animationDuration: `${1500 + Math.round(next() * 500)}ms`,
        } as CSSProperties,
      };
    });
  }, []);
  return (
    <div aria-hidden="true" className="absolute top-0 left-1/2">
      {pieces.map((piece, i) => (
        <span
          key={i}
          style={piece.style}
          className={cn("absolute -translate-1/2 animate-confetti opacity-0", piece.shape)}
        />
      ))}
    </div>
  );
}
