import { useState } from "react";
import { Menu, Plus } from "lucide-react";
import {
  canToggle,
  counterLabel,
  currentStreakDays,
  fmtLong,
  fromISO,
  loggedToday,
  sinceLabel,
  statusLabel,
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
import { useTodaysSlip } from "./LogSlipDialog.tsx";
import { NewHabitDialog } from "./NewHabitDialog.tsx";
import { ScreenScroll, useInFront, useNav } from "./stack.tsx";
import { useToday } from "./use-today.ts";

export function Home() {
  const store = useHabitStore();
  const habits = useHabits();
  const day = useToday();
  const [adding, setAdding] = useState(false);
  // the browser's forward button can cover Home while New habit is open
  const inFront = useInFront();
  if (!inFront && adding) setAdding(false);
  const { push } = useNav();
  const { layout } = useSettings();
  const { toggleSlip, dialog: slipDialog } = useTodaysSlip();
  const open = (habit: Habit) => push({ name: "detail", id: habit.id });
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
          <p className="text-sm text-muted-foreground">{fmtLong(fromISO(day))}</p>
          <h1 className="mt-0.5 font-display text-4xl leading-[1.05] font-medium tracking-[-0.032em] [font-stretch:96%]">
            Habits
          </h1>
        </header>
        <div className="px-5 pb-5">
          {habits.length === 0 ? (
            <EmptyHabits onAdd={() => setAdding(true)} />
          ) : layout === "list" ? (
            <HabitList
              habits={habits}
              day={day}
              onOpen={open}
              onSlip={toggleSlip}
              onAdd={() => setAdding(true)}
            />
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
                    onClick={() => open(habit)}
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
      </ScreenScroll>
      <NewHabitDialog open={adding} onClose={() => setAdding(false)} />
      {slipDialog}
    </>
  );
}

/**
 * Under the count: what it counts, or, with no streak yet, why: "check in today to start" (build),
 * "started today" or "slip logged today" (quit).
 */
const labelOf = (habit: Habit, days: number) =>
  days === 0 ? sinceLabel(habit) : counterLabel(habit, days);

/**
 * The list layout: a row per habit, whose tick checks a build habit in today with one tap and
 * whose slip button asks before logging a quit habit's slip. The rest of the row opens the habit.
 */
function HabitList({
  habits,
  day,
  onOpen,
  onSlip,
  onAdd,
}: {
  habits: Habit[];
  day: string;
  onOpen: (habit: Habit) => void;
  onSlip: (habit: Habit) => void;
  onAdd: () => void;
}) {
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
            status={statusLabel(habit)}
            kind={habit.kind}
            color={habit.color}
            onClick={() => onOpen(habit)}
            checkedIn={loggedToday(habit)}
            onCheckIn={() => void store.toggleDay(habit.id)}
            slipped={loggedToday(habit)}
            slipLocked={!canToggle(habit, day)}
            onSlip={() => onSlip(habit)}
          />
        );
      })}
      <NewHabitTile layout="list" onClick={onAdd} />
    </HabitCollection>
  );
}

function EmptyHabits({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="max-w-[30rem] rounded-3xl bg-muted px-6 pt-7 pb-6">
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
