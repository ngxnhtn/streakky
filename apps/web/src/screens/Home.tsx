import { useState } from "react";
import { Plus } from "lucide-react";
import {
  canToggle,
  counterLabel,
  currentStreakDays,
  fmtLong,
  fromISO,
  loggedToday,
  sinceLabel,
  type Habit,
} from "@streakky/core";
import { AppBar } from "@streakky/ui/components/app-bar";
import { Button } from "@streakky/ui/components/button";
import { HabitCard, HabitCollection, NewHabitTile } from "@streakky/ui/components/habit/habit-card";
import { useHabitStore, useHabits } from "../store/react.tsx";
import { LogSlipDialog } from "./LogSlipDialog.tsx";
import { NewHabitDialog } from "./NewHabitDialog.tsx";
import { useToday } from "./use-today.ts";

export function Home() {
  const store = useHabitStore();
  const habits = useHabits();
  const day = useToday();
  const [adding, setAdding] = useState(false);
  // the quit habit whose slip we're asking about, kept while the sheet leaves
  const [slipping, setSlipping] = useState<{ habit: Habit; open: boolean } | null>(null);
  /** Today's slip is removed at once, but logging one asks first: it ends the current streak. */
  const toggleSlip = (habit: Habit) =>
    loggedToday(habit) ? void store.toggleDay(habit.id) : setSlipping({ habit, open: true });
  /** Logs today's slip unless it already is, say from another tab while the sheet was open. */
  const logSlip = (asked: Habit) => {
    const habit = habits.find((h) => h.id === asked.id);
    if (habit && !loggedToday(habit)) void store.toggleDay(habit.id);
  };
  return (
    <>
      <AppBar
        right={
          <Button variant="ring" size="icon" aria-label="New habit" onClick={() => setAdding(true)}>
            <Plus strokeWidth={1.75} />
          </Button>
        }
      />
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[72px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <header className="px-5 pt-1 pb-5">
          <p className="text-sm text-muted-foreground">{fmtLong(fromISO(day))}</p>
          <h1 className="mt-0.5 font-display text-4xl leading-[1.05] font-medium tracking-[-0.032em] [font-stretch:96%]">
            Habits
          </h1>
        </header>
        <div className="px-5 pb-5">
          {habits.length === 0 ? (
            <EmptyHabits onAdd={() => setAdding(true)} />
          ) : (
            <HabitCollection layout="grid">
              {habits.map((habit) => {
                const days = currentStreakDays(habit);
                return (
                  <HabitCard
                    key={habit.id}
                    name={habit.name}
                    days={days}
                    label={labelOf(habit, days)}
                    kind={habit.kind}
                    color={habit.color}
                    checkedIn={loggedToday(habit)}
                    onCheckIn={() => void store.toggleDay(habit.id)}
                    slipped={loggedToday(habit)}
                    slipLocked={!canToggle(habit, day)}
                    onSlip={() => toggleSlip(habit)}
                  />
                );
              })}
              <NewHabitTile layout="grid" onClick={() => setAdding(true)} />
            </HabitCollection>
          )}
        </div>
      </main>
      <NewHabitDialog open={adding} onClose={() => setAdding(false)} />
      <LogSlipDialog
        habit={slipping?.habit ?? null}
        open={slipping?.open ?? false}
        onLog={logSlip}
        onClose={() => setSlipping((s) => s && { ...s, open: false })}
      />
    </>
  );
}

/**
 * Under the count: what it counts, or, with no streak yet, why: "log today to start" (build),
 * "started today" or "slip logged today" (quit).
 */
const labelOf = (habit: Habit, days: number) =>
  days === 0 ? sinceLabel(habit) : counterLabel(habit, days);

function EmptyHabits({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="max-w-[480px] rounded-3xl bg-muted px-6 pt-7 pb-6">
      <p className="text-xl font-medium tracking-[-0.015em]">Nothing counted yet</p>
      <p className="mt-1.5 mb-5 text-muted-foreground">
        Add a habit to build, like a morning run, or one to quit, like smoking.
      </p>
      <Button className="w-full" onClick={onAdd}>
        Add a habit
      </Button>
    </div>
  );
}
