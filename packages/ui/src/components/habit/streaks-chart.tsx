import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { fmtDayMonth, plural, type Streak } from "@streakky/core";
import { cn } from "@streakky/ui/lib/utils";

/** A bar's slot: 4rem wide at most, and narrower when the streaks need the room. */
const slotOf = (n: number) => `min(4rem, 100% / ${n})`;
/** The middle of the i-th bar's slot, as a CSS length. */
const middleOf = (i: number, n: number) => `(${i} + 0.5) * ${slotOf(n)}`;
/**
 * Where a tag of `chars` characters starts, centred under the i-th bar and kept inside the plot.
 * The tags are in a monospaced face, so a character is 1ch.
 */
const tagStart = (i: number, n: number, chars: number) =>
  `clamp(0ch, calc(${middleOf(i, n)} - ${chars / 2}ch), calc(100% - ${chars}ch))`;

/**
 * One series: every streak, oldest first. Earlier streaks stay neutral, the current streak takes the
 * habit colour. The longest, the current and the chosen streak carry their numbers, and tags under
 * the axis mark the longest and the current. A readout under them names the chosen streak, or the
 * one under the pointer, and a hidden table holds them all.
 *
 * The plot is one control, a slider over the streaks: the arrow keys, Home and End move between
 * them, and a tap or click anywhere on it chooses the nearest. A screen reader hears the streak
 * chosen, as it changes, and nothing as the pointer passes over.
 */
export function StreaksChart({
  streaks,
  name,
  noStreakYet,
  className,
}: {
  streaks: Streak[];
  name: string;
  /** what the current streak's dates say while it has no days: "check in today to start" */
  noStreakYet: string;
  className?: string;
}) {
  const n = streaks.length;
  const current = n - 1;
  const max = Math.max(...streaks.map((streak) => streak.days), 1);
  // the latest of equals, so a current streak that ties the longest is the longest; none at 0 days
  const longest = streaks.findLastIndex((streak) => streak.days === max);
  // null follows the current streak, whatever the number of streaks becomes
  const [chosen, setChosen] = useState<number | null>(null);
  const [pointed, setPointed] = useState<number | null>(null);
  const inRange = (i: number | null) => (i !== null && i < n ? i : null);
  const picked = inRange(chosen) ?? current;
  const shown = inRange(pointed) ?? picked;

  const range = (streak: Streak) =>
    streak.current
      ? streak.days === 0
        ? noStreakYet
        : `since ${fmtDayMonth(streak.start)}`
      : streak.start === streak.end
        ? fmtDayMonth(streak.start)
        : `${fmtDayMonth(streak.start)} – ${fmtDayMonth(streak.end)}`;
  const titleOf = (i: number) => (i === current ? "Current streak" : `Streak ${i + 1}`);
  const said = (i: number) =>
    `${i === current ? "Current streak" : `Streak ${i + 1} of ${n}`}${i === longest ? ", the longest" : ""}: ${plural(streaks[i].days, "day")}, ${range(streaks[i])}`;

  /** The streak under the pointer: the nearest bar's. */
  const streakAt = (event: MouseEvent<HTMLElement>) => {
    const plot = event.currentTarget.getBoundingClientRect();
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const slot = Math.min(4 * rem, plot.width / n);
    return Math.max(0, Math.min(n - 1, Math.floor((event.clientX - plot.left) / slot)));
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const to = {
      ArrowLeft: picked - 1,
      ArrowDown: picked - 1,
      ArrowRight: picked + 1,
      ArrowUp: picked + 1,
      Home: 0,
      End: current,
    }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    setChosen(Math.max(0, Math.min(current, to)));
    setPointed(null);
  };

  const currentTag = longest === current ? "Current, longest" : "Current";
  const currentStart = tagStart(current, n, currentTag.length);
  // the longest's tag gives way to the current's, a character apart
  const longestStart = `max(0ch, min(${tagStart(longest, n, 7)}, calc(${currentStart} - 8ch)))`;

  return (
    <figure data-slot="streaks-chart" className={cn("m-0", className)}>
      <figcaption className="text-[0.8125rem] font-medium text-muted-foreground">
        Every streak
      </figcaption>
      <div
        role="slider"
        tabIndex={0}
        aria-label={`Every streak of ${name}`}
        aria-valuemin={1}
        aria-valuemax={n}
        aria-valuenow={picked + 1}
        aria-valuetext={said(picked)}
        onKeyDown={onKeyDown}
        onPointerMove={(event) => {
          if (event.pointerType !== "touch") setPointed(streakAt(event));
        }}
        onPointerLeave={() => setPointed(null)}
        onClick={(event) => {
          setChosen(streakAt(event));
          setPointed(null);
        }}
        className="mt-2 flex h-[9.25rem] cursor-pointer items-stretch rounded-t-[0.25rem] border-b border-input pt-[1.375rem] focus-ring"
      >
        {streaks.map((streak, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{ width: `calc(${slotOf(n)})` }}
            className="relative flex flex-none items-end justify-center"
          >
            <span
              style={{ height: `${Math.max(2, (streak.days / max) * 100)}%` }}
              className={cn(
                "relative w-[min(2.25rem,72%)] rounded-t-[0.25rem] transition-[background-color,height] duration-600 ease-enter",
                streak.current
                  ? "bg-habit"
                  : i === shown
                    ? "bg-foreground/80"
                    : "bg-foreground/62 dark:bg-foreground/55",
              )}
            >
              {(i === longest || streak.current || i === shown) && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 font-mono text-xs tabular-nums">
                  {streak.days}
                </span>
              )}
            </span>
          </span>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="relative h-[1.375rem] font-mono text-[0.6875rem] leading-none text-muted-foreground"
      >
        {[current, ...(longest >= 0 && longest !== current ? [longest] : [])].map((i) => (
          <span
            key={i}
            style={{ left: `calc(${middleOf(i, n)})` }}
            className="absolute top-0 h-1.5 w-px bg-input"
          />
        ))}
        <span style={{ left: currentStart }} className="absolute top-2.5 whitespace-nowrap">
          {currentTag}
        </span>
        {longest >= 0 && longest !== current && (
          <span style={{ left: longestStart }} className="absolute top-2.5 whitespace-nowrap">
            Longest
          </span>
        )}
      </div>
      <p aria-hidden="true" className="mt-1.5 text-[0.8125rem] text-muted-foreground tabular-nums">
        <span className="mr-1.5 font-medium text-foreground">{titleOf(shown)}</span>
        {plural(streaks[shown].days, "day")} · {range(streaks[shown])}
      </p>
      <table className="sr-only">
        <caption>Every streak of {name}</caption>
        <thead>
          <tr>
            <th scope="col">Streak</th>
            <th scope="col">Days</th>
            <th scope="col">Dates</th>
          </tr>
        </thead>
        <tbody>
          {streaks.map((streak, i) => (
            <tr key={i}>
              <td>
                {streak.current ? "Current" : i + 1}
                {i === longest && ", the longest"}
              </td>
              <td>{streak.days}</td>
              <td>{range(streak)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
