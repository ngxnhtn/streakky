import { Check } from "lucide-react";
import { GOALS, currentDays, fmtShort, goalDate, plural, type Streak } from "@streakky/core";
import { ToggleChip, ToggleGroup } from "@streakky/ui/components/toggle-group";

/** How far to the goal, a progress bar, and the goal chips (reached ones carry a tick). */
export function StreakGoal({
  streak,
  onGoalChange,
  className,
}: {
  streak: Streak;
  onGoalChange: (goal: number | null) => void;
  className?: string;
}) {
  const days = currentDays(streak);
  const goal = streak.goal;
  const on = goalDate(streak);
  const unit = streak.mode === "build" ? "day" : "clean day";
  const [big, sub] =
    goal === null || !on
      ? ["No goal yet", "Pick a number of days below to aim for."]
      : days >= goal
        ? ["Goal reached", `${goal} days on ${fmtShort(on)}. Set the next one below.`]
        : [`${plural(goal - days, unit)} to go`, `${goal}-day goal on ${fmtShort(on)}`];
  return (
    <div data-slot="streak-goal" className={className}>
      <p className="font-display text-[26px] leading-[1.15] font-medium tracking-[-0.025em]">
        {big}
      </p>
      <p className="mt-1 text-muted-foreground">{sub}</p>
      {goal !== null && (
        <div className="mt-5">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-streak transition-[width] duration-600 ease-enter"
              style={{ width: `${Math.min(100, (days / goal) * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground">
            <span>{days}</span>
            <span>{goal}</span>
          </div>
        </div>
      )}
      <h3 className="mt-7 mb-3 text-[13px] font-medium text-muted-foreground">Change goal</h3>
      <ToggleGroup
        value={goal === null ? "none" : String(goal)}
        onValueChange={(v) => onGoalChange(v === "none" ? null : Number(v))}
        aria-label="Goal in days"
      >
        {GOALS.map((g) => (
          <ToggleChip
            key={g}
            value={String(g)}
            className={days >= g ? "text-muted-foreground" : ""}
          >
            {days >= g && <Check />}
            {g}
          </ToggleChip>
        ))}
        <ToggleChip value="none">None</ToggleChip>
      </ToggleGroup>
    </div>
  );
}
