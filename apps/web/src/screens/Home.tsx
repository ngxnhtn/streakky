import { useState } from "react";
import { Menu, Plus } from "lucide-react";
import {
  counterLabel,
  currentStreak,
  currentStreakDays,
  fmtDayMonth,
  fmtLong,
  loggedToday,
  sinceLabel,
  today,
  type Habit,
} from "@streakky/core";
import { AppBar } from "@streakky/ui/components/app-bar";
import { Button } from "@streakky/ui/components/button";
import {
  HabitCard,
  HabitCollection,
  HabitRow,
  NewHabitTile,
} from "@streakky/ui/components/habit/habit-card";
import { useHabitStore, useHabits, useSettings } from "../store/react.tsx";
import { NewHabitDialog } from "./NewHabitDialog.tsx";
import { ScreenScroll, useNav } from "./stack.tsx";

export function Home() {
  const store = useHabitStore();
  const habits = useHabits();
  const [adding, setAdding] = useState(false);
  const { push } = useNav();
  const { layout } = useSettings();
  return (
    <>
      <AppBar
        left={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Settings"
            onClick={() => push({ name: "settings" })}
          >
            <Menu strokeWidth={1.75} />
          </Button>
        }
        right={
          <Button variant="ring" size="icon" aria-label="New habit" onClick={() => setAdding(true)}>
            <Plus strokeWidth={1.75} />
          </Button>
        }
      />
      <ScreenScroll>
        <header className="px-5 pt-1 pb-5">
          <p className="text-sm text-muted-foreground">{fmtLong(today())}</p>
          <h1 className="mt-0.5 font-display text-4xl leading-[1.05] font-medium tracking-[-0.032em] [font-stretch:96%]">
            Habits
          </h1>
        </header>
        <div className="px-5 pb-5">
          {habits.length === 0 ? (
            <EmptyHabits onAdd={() => setAdding(true)} />
          ) : layout === "list" ? (
            <HabitList habits={habits} onAdd={() => setAdding(true)} />
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
      </ScreenScroll>
      <NewHabitDialog open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

/** Under the count: what it counts, or what today needs while a build habit has no streak. */
const labelOf = (habit: Habit, days: number) =>
  habit.kind === "build" && days === 0 ? sinceLabel(habit) : counterLabel(habit, days);

/** The list layout: a row per habit, whose tick checks a build habit in today with one tap. */
function HabitList({ habits, onAdd }: { habits: Habit[]; onAdd: () => void }) {
  const store = useHabitStore();
  return (
    <HabitCollection layout="list">
      {habits.map((habit) => {
        const days = currentStreakDays(habit);
        return (
          <HabitRow
            key={habit.id}
            name={habit.name}
            days={days}
            label={counterLabel(habit, days)}
            status={statusOf(habit)}
            kind={habit.kind}
            color={habit.color}
            checkedIn={loggedToday(habit)}
            onCheckIn={() => void store.toggleDay(habit.id)}
          />
        );
      })}
      <NewHabitTile layout="list" onClick={onAdd} />
    </HabitCollection>
  );
}

/** The line under a name in the list: what today needs, or how long the streak has run. */
function statusOf(habit: Habit): string {
  const streak = currentStreak(habit);
  if (habit.kind === "quit") {
    if (loggedToday(habit)) return "Slip logged today";
    return streak.days === 0 ? "Started today" : `Since ${fmtDayMonth(streak.start)}`;
  }
  if (loggedToday(habit)) return "Checked in today";
  return streak.days === 0 ? "Log today to start" : "Not checked in today";
}

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
