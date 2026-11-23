import {
  daysBetween,
  historyStart,
  loggedDays,
  longestStreakDays,
  streaksOf,
  today,
  type Habit,
} from "@streakky/core";
import { StatGrid, StatTile } from "@streakky/ui/components/stat";
import { StreaksChart } from "@streakky/ui/components/habit/streaks-chart";
import { cn } from "@streakky/ui/lib/utils";

/** Four numbers and the streaks chart. Build: totals and the last 30 days; quit: average and slips. */
export function HabitStats({
  habit,
  className,
  tilesClassName,
}: {
  habit: Habit;
  className?: string;
  tilesClassName?: string;
}) {
  const streaks = streaksOf(habit);
  const days = streaks[streaks.length - 1].days;
  const lengths = streaks.map((s) => s.days);
  const longest = longestStreakDays(habit);
  const average = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
  const unit = (n: number) => (n === 1 ? "day" : "days");
  const t = today();
  const tracked = Math.min(30, daysBetween(historyStart(habit), t) + 1);
  // check-ins or slips: only the ones that count (none after today, no slip before the quit day)
  const logged = loggedDays(habit);
  const tiles =
    habit.kind === "build"
      ? [
          { value: days, unit: unit(days), label: "This streak" },
          { value: longest, unit: unit(longest), label: "Longest streak" },
          { value: logged.length, unit: unit(logged.length), label: "Check-ins" },
          {
            value: logged.filter((d) => daysBetween(d, t) < 30).length,
            unit: `of ${tracked}`,
            label: "Last 30 days",
          },
        ]
      : [
          { value: days, unit: unit(days), label: "This streak" },
          { value: longest, unit: unit(longest), label: "Longest streak" },
          { value: average, unit: unit(average), label: "Average streak" },
          { value: logged.length, unit: "", label: logged.length === 1 ? "Slip" : "Slips" },
        ];
  return (
    <div data-slot="habit-stats" className={className}>
      <StatGrid className={tilesClassName}>
        {tiles.map((t) => (
          <StatTile key={t.label} value={t.value} unit={t.unit} label={t.label} />
        ))}
      </StatGrid>
      <StreaksChart streaks={streaks} name={habit.name} className={cn("mt-7")} />
    </div>
  );
}
