import { daysBetween, runsOf, today, type Streak } from "@streakky/core";
import { StatGrid, StatTile } from "@streakky/ui/components/stat";
import { RunsChart } from "@streakky/ui/components/streak/runs-chart";
import { cn } from "@streakky/ui/lib/utils";

/** Four numbers and the runs chart. Build: totals and the last 30 days; quit: average and slips. */
export function StreakStats({
  streak,
  className,
  tilesClassName,
}: {
  streak: Streak;
  className?: string;
  tilesClassName?: string;
}) {
  const runs = runsOf(streak);
  const days = runs[runs.length - 1].days;
  const lengths = runs.map((r) => r.days);
  const longest = Math.max(...lengths);
  const average = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
  const unit = (n: number) => (n === 1 ? "day" : "days");
  const t = today();
  const last30 = streak.marks.filter((m) => daysBetween(m, t) < 30).length;
  const tracked = Math.min(30, daysBetween(streak.start, t) + 1);
  const tiles =
    streak.mode === "build"
      ? [
          { value: days, unit: unit(days), label: "This run" },
          { value: longest, unit: unit(longest), label: "Longest run" },
          { value: streak.marks.length, unit: unit(streak.marks.length), label: "Done in total" },
          { value: last30, unit: `of ${tracked}`, label: "Last 30 days" },
        ]
      : [
          { value: days, unit: unit(days), label: "This run" },
          { value: longest, unit: unit(longest), label: "Longest run" },
          { value: average, unit: unit(average), label: "Average run" },
          {
            value: streak.marks.length,
            unit: "",
            label: streak.marks.length === 1 ? "Slip" : "Slips",
          },
        ];
  return (
    <div data-slot="streak-stats" className={className}>
      <StatGrid className={tilesClassName}>
        {tiles.map((t) => (
          <StatTile key={t.label} value={t.value} unit={t.unit} label={t.label} />
        ))}
      </StatGrid>
      <RunsChart runs={runs} name={streak.name} className={cn("mt-7")} />
    </div>
  );
}
