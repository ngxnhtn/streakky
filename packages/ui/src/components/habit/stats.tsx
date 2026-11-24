import { archivedSince, habitStats, streaksOf, type Habit } from "@streakky/core";
import { StatGrid, StatTile } from "@streakky/ui/components/stat";
import { StreaksChart } from "@streakky/ui/components/habit/streaks-chart";
import { KIND_COPY } from "@streakky/ui/lib/kind-copy";

const days = (n: number) => (n === 1 ? "day" : "days");

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
  const stats = habitStats(habit);
  const copy = KIND_COPY[habit.kind];
  const logged = stats.logged === 1 ? copy.logged.one : copy.logged.other;
  const tiles = [
    { value: stats.currentStreak, unit: days(stats.currentStreak), label: "Current streak" },
    { value: stats.longestStreak, unit: days(stats.longestStreak), label: "Longest streak" },
    ...(habit.kind === "build"
      ? [
          { value: stats.logged, unit: days(stats.logged), label: logged },
          { value: stats.loggedLast30, unit: `of ${stats.trackedLast30}`, label: "Last 30 days" },
        ]
      : [
          { value: stats.averageStreak, unit: days(stats.averageStreak), label: "Average streak" },
          { value: stats.logged, unit: "", label: logged },
        ]),
  ];
  return (
    <div data-slot="habit-stats" className={className}>
      <StatGrid className={tilesClassName}>
        {tiles.map((tile) => (
          <StatTile key={tile.label} value={tile.value} unit={tile.unit} label={tile.label} />
        ))}
      </StatGrid>
      <StreaksChart
        streaks={streaksOf(habit)}
        name={habit.name}
        // an archived habit can't start one until it's restored
        noStreakYet={archivedSince(habit) !== null ? copy.noStreakArchived : copy.noStreakYet}
        className="mt-7"
      />
    </div>
  );
}
