import { Check } from "lucide-react";
import { GOALS, currentStreakDays, fmtShort, goalDate, plural, type Habit } from "@streakky/core";
import { ToggleChip, ToggleGroup } from "@streakky/ui/components/toggle-group";
import { KIND_COPY } from "@streakky/ui/lib/kind-copy";

/** The chip for no goal; the chips hold strings, the goal a number or null. */
const NONE = "none";

/**
 * The goal presets as chips, and None. With `reached`, the days of the current streak, the goals
 * it has reached carry a tick.
 */
export function GoalPicker({
  value,
  onValueChange,
  reached,
  className,
}: {
  value: number | null;
  onValueChange: (goal: number | null) => void;
  reached?: number;
  className?: string;
}) {
  return (
    <ToggleGroup
      value={value === null ? NONE : String(value)}
      onValueChange={(chosen) => onValueChange(chosen === NONE ? null : Number(chosen))}
      aria-label="Goal in days"
      className={className}
    >
      {GOALS.map((goal) => {
        const done = reached !== undefined && reached >= goal;
        return (
          <ToggleChip
            key={goal}
            value={String(goal)}
            className={done ? "text-muted-foreground" : undefined}
          >
            {done && <Check />}
            {goal}
          </ToggleChip>
        );
      })}
      <ToggleChip value={NONE}>None</ToggleChip>
    </ToggleGroup>
  );
}

/** How far to the goal, a progress bar, and the goal chips (reached ones carry a tick). */
export function HabitGoal({
  habit,
  onGoalChange,
  className,
}: {
  habit: Habit;
  onGoalChange: (goal: number | null) => void;
  className?: string;
}) {
  const days = currentStreakDays(habit);
  const goal = habit.goal;
  const on = goalDate(habit);
  const unit = KIND_COPY[habit.kind].goalDay;
  const [big, sub] =
    goal === null || !on
      ? ["No goal yet", "Pick a number of days below to aim for."]
      : days >= goal
        ? ["Goal reached", `${goal} days on ${fmtShort(on)}. Set the next one below.`]
        : [`${plural(goal - days, unit)} to go`, `${goal}-day goal on ${fmtShort(on)}`];
  return (
    <div data-slot="habit-goal" className={className}>
      <p className="font-display text-[1.625rem] leading-[1.15] font-medium tracking-[-0.025em]">
        {big}
      </p>
      <p className="mt-1 text-muted-foreground">{sub}</p>
      {goal !== null && (
        <div className="mt-5">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-habit transition-[width] duration-600 ease-enter"
              style={{ width: `${Math.min(100, (days / goal) * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground">
            <span>{days}</span>
            <span>{goal}</span>
          </div>
        </div>
      )}
      <h2 className="mt-7 mb-3 text-[0.8125rem] font-medium text-muted-foreground">Change goal</h2>
      <GoalPicker value={goal} onValueChange={onGoalChange} reached={days} />
    </div>
  );
}
