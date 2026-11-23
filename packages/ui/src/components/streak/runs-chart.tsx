import { useState } from "react";
import { fmtDayMonth, plural, type Run } from "@streakky/core";
import { cn } from "@streakky/ui/lib/utils";

const range = (r: Run) =>
  r.now
    ? r.days === 0
      ? "starts with today"
      : `since ${fmtDayMonth(r.start)}`
    : r.start === r.end
      ? fmtDayMonth(r.start)
      : `${fmtDayMonth(r.start)} – ${fmtDayMonth(r.end)}`;

/**
 * One series: every run, oldest first. Earlier runs stay neutral, the current run takes the
 * streak colour. The longest, the current and the pointed-at run carry their numbers; a
 * readout under the axis names the pointed-at run, and a hidden table holds them all.
 */
export function RunsChart({
  runs,
  name,
  className,
}: {
  runs: Run[];
  name: string;
  className?: string;
}) {
  const max = Math.max(...runs.map((r) => r.days), 1);
  const longest = runs.findIndex((r) => r.days === max);
  // null follows the current run, whatever the number of runs becomes
  const [pointed, setPointed] = useState<number | null>(null);
  const active = pointed !== null && pointed < runs.length ? pointed : runs.length - 1;
  const pick = runs[active];

  return (
    <figure data-slot="runs-chart" className={cn("m-0", className)}>
      <figcaption className="text-[13px] font-medium text-muted-foreground">Every run</figcaption>
      <div
        className="mt-2 flex h-[148px] items-stretch gap-0.5 border-b border-input pt-[22px]"
        onPointerLeave={() => setPointed(null)}
      >
        {runs.map((r, i) => (
          <button
            type="button"
            key={i}
            aria-label={`${r.now ? "Current run" : `Run ${i + 1}`}: ${plural(r.days, "day")}`}
            onPointerEnter={() => setPointed(i)}
            onFocus={() => setPointed(i)}
            onClick={() => setPointed(i)}
            className="relative flex max-w-16 flex-1 items-end justify-center outline-none focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span
              style={{ height: `${Math.max(2, (r.days / max) * 100)}%` }}
              className={cn(
                "relative w-[min(36px,72%)] rounded-t-[4px] transition-[background-color,height] duration-600 ease-enter",
                r.now
                  ? "bg-streak"
                  : i === active
                    ? "bg-foreground/80"
                    : "bg-foreground/62 dark:bg-foreground/55",
              )}
            >
              {(i === longest || r.now || i === active) && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 font-mono text-xs tabular-nums">
                  {r.days}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      <p aria-live="polite" className="mt-2.5 text-[13px] text-muted-foreground tabular-nums">
        <span className="mr-1.5 font-medium text-foreground">
          {pick.now ? "This run" : `Run ${active + 1}`}
        </span>
        {plural(pick.days, "day")} · {range(pick)}
      </p>
      <table className="sr-only">
        <caption>Every run of {name}</caption>
        <thead>
          <tr>
            <th scope="col">Run</th>
            <th scope="col">Days</th>
            <th scope="col">Dates</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r, i) => (
            <tr key={i}>
              <td>{r.now ? "Current" : i + 1}</td>
              <td>{r.days}</td>
              <td>{range(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
