import { GOALS } from "@streakky/core";
import { useTween } from "@streakky/ui/hooks/use-tween";
import { cn } from "@streakky/ui/lib/utils";

/** A 270° gauge open at the bottom, as drawn in the wireframe. */
const ARC = "M52.32 227.68A124 124 0 1 1 227.68 227.68";

/**
 * The big counter. The arc and the number ease up together; the small line in the gap says
 * since when. Colour: the nearest data-habit-color.
 */
export function StreakRing({
  days,
  goal,
  label,
  since,
  className,
}: {
  days: number;
  /** the habit's goal; with none, the arc fills toward the next milestone */
  goal: number | null;
  /** under the number: "day streak", "days free" */
  label: string;
  since: string;
  className?: string;
}) {
  const shown = useTween(days);
  const full = goal ?? GOALS.find((g) => g > days) ?? days;
  const p = Math.min(1, full > 0 ? shown / full : 0) * 100;
  return (
    <div
      data-slot="streak-ring"
      className={cn("relative mx-auto aspect-square w-[280px]", className)}
    >
      <svg viewBox="0 0 280 280" aria-hidden="true" className="block size-full overflow-visible">
        <path
          d={ARC}
          pathLength={100}
          className="fill-none stroke-habit/16 [stroke-linecap:round] [stroke-width:10]"
        />
        <path
          d={ARC}
          pathLength={100}
          strokeDasharray={`${p} 100`}
          style={{ opacity: p > 0.2 ? 1 : 0 }}
          className="fill-none stroke-habit transition-[stroke] duration-300 [stroke-linecap:round] [stroke-width:10]"
        />
      </svg>
      <div
        role="img"
        aria-label={goal === null ? `${days} ${label}` : `${days} ${label}, goal ${goal} days`}
        className="absolute inset-0 flex flex-col items-center justify-center pb-2"
      >
        <span className="font-display text-[96px] leading-[0.9] font-medium tracking-[-0.05em] tabular-nums [font-stretch:96%]">
          {Math.round(shown)}
        </span>
        <span className="mt-2 text-base text-muted-foreground">{label}</span>
      </div>
      <span className="absolute inset-x-0 bottom-[22px] text-center font-mono text-xs text-muted-foreground">
        {since}
      </span>
    </div>
  );
}
