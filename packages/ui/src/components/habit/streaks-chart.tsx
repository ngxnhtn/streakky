import { useState } from "react";
import { fmtDayMonth, plural, type Streak } from "@streakky/core";
import { cn } from "@streakky/ui/lib/utils";

const range = (streak: Streak) =>
  streak.current
    ? streak.days === 0
      ? "starts with today"
      : `since ${fmtDayMonth(streak.start)}`
    : streak.start === streak.end
      ? fmtDayMonth(streak.start)
      : `${fmtDayMonth(streak.start)} – ${fmtDayMonth(streak.end)}`;

/**
 * One series: every streak, oldest first. Earlier streaks stay neutral, the current streak takes the
 * habit colour. The longest, the current and the pointed-at streak carry their numbers; a
 * readout under the axis names the pointed-at streak, and a hidden table holds them all.
 */
export function StreaksChart({
  streaks,
  name,
  className,
}: {
  streaks: Streak[];
  name: string;
  className?: string;
}) {
  const max = Math.max(...streaks.map((streak) => streak.days), 1);
  const longest = streaks.findIndex((streak) => streak.days === max);
  // null follows the current streak, whatever the number of streaks becomes
  const [pointed, setPointed] = useState<number | null>(null);
  const active = pointed !== null && pointed < streaks.length ? pointed : streaks.length - 1;
  const pick = streaks[active];

  return (
    <figure data-slot="streaks-chart" className={cn("m-0", className)}>
      <figcaption className="text-[13px] font-medium text-muted-foreground">
        Every streak
      </figcaption>
      <div
        className="mt-2 flex h-[148px] items-stretch gap-0.5 border-b border-input pt-[22px]"
        onPointerLeave={() => setPointed(null)}
      >
        {streaks.map((streak, i) => (
          <button
            type="button"
            key={i}
            aria-label={`${streak.current ? "Current streak" : `Streak ${i + 1}`}: ${plural(streak.days, "day")}`}
            onPointerEnter={() => setPointed(i)}
            onFocus={() => setPointed(i)}
            onClick={() => setPointed(i)}
            className="relative flex max-w-16 flex-1 items-end justify-center outline-none focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span
              style={{ height: `${Math.max(2, (streak.days / max) * 100)}%` }}
              className={cn(
                "relative w-[min(36px,72%)] rounded-t-[4px] transition-[background-color,height] duration-600 ease-enter",
                streak.current
                  ? "bg-habit"
                  : i === active
                    ? "bg-foreground/80"
                    : "bg-foreground/62 dark:bg-foreground/55",
              )}
            >
              {(i === longest || streak.current || i === active) && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 font-mono text-xs tabular-nums">
                  {streak.days}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      <p aria-live="polite" className="mt-2.5 text-[13px] text-muted-foreground tabular-nums">
        <span className="mr-1.5 font-medium text-foreground">
          {pick.current ? "This streak" : `Streak ${active + 1}`}
        </span>
        {plural(pick.days, "day")} · {range(pick)}
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
              <td>{streak.current ? "Current" : i + 1}</td>
              <td>{streak.days}</td>
              <td>{range(streak)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
