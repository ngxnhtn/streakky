import { useState } from "react";
import { Plus } from "lucide-react";
import {
  counterLabel,
  currentStreakDays,
  fmtLong,
  loggedToday,
  sinceLabel,
  today,
  type Habit,
} from "@streakky/core";
import { AppBar } from "@streakky/ui/components/app-bar";
import { Button } from "@streakky/ui/components/button";
import { HabitCard, HabitCollection, NewHabitTile } from "@streakky/ui/components/habit/habit-card";
import { useHabitStore, useHabits } from "../store/react.tsx";
import { NewHabitDialog } from "./NewHabitDialog.tsx";

export function Home() {
  const store = useHabitStore();
  const habits = useHabits();
  const [adding, setAdding] = useState(false);
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
          <p className="text-sm text-muted-foreground">{fmtLong(today())}</p>
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
                  />
                );
              })}
              <NewHabitTile layout="grid" onClick={() => setAdding(true)} />
            </HabitCollection>
          )}
        </div>
      </main>
      <NewHabitDialog open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

/** Under the count: what it counts, or what today needs while a build habit has no streak. */
const labelOf = (habit: Habit, days: number) =>
  habit.kind === "build" && days === 0 ? sinceLabel(habit) : counterLabel(habit, days);

function EmptyHabits({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="max-w-[480px] rounded-3xl bg-muted px-6 pt-7 pb-6">
      <p className="text-xl font-medium tracking-[-0.015em]">Nothing counted yet</p>
      <p className="mt-1.5 mb-5 text-muted-foreground">
        Add a habit you want to do every day, like a morning run.
      </p>
      <Button className="w-full" onClick={onAdd}>
        Add a habit
      </Button>
    </div>
  );
}
