import { useState } from "react";
import { Menu, Plus } from "lucide-react";
import {
  canToggle,
  counterLabel,
  currentStreakDays,
  fmtLong,
  fromISO,
  loggedToday,
  statusLabel,
  type Habit,
  type Layout,
} from "@streakky/core";
import { AppBar } from "@streakky/ui/components/app-bar";
import { Button } from "@streakky/ui/components/button";
import { EmptyState } from "@streakky/ui/components/empty-state";
import {
  HabitCard,
  HabitCollection,
  HabitRow,
  NewHabitTile,
  type HabitFaceProps,
} from "@streakky/ui/components/habit/habit-card";
import { useArchivedHabits, useHabitStore, useHabits, useSettings } from "../store/react.tsx";
import { useCelebration } from "./Celebration.tsx";
import { useTodaysSlip } from "./LogSlipDialog.tsx";
import { NewHabitDialog } from "./NewHabitDialog.tsx";
import { ReorderHint } from "./ReorderHint.tsx";
import { SignedOutNote, useSignedOutNoteShown } from "./SignedOutNote.tsx";
import { ScreenScroll, useCloseWhenCovered, useNav } from "./stack.tsx";
import { useToday } from "./use-today.ts";

export function Home() {
  const store = useHabitStore();
  const habits = useHabits();
  const empty = emptyHome(habits, useArchivedHabits());
  const day = useToday();
  const [adding, setAdding] = useState(false);
  // the browser's forward button can cover Home while New habit is open
  useCloseWhenCovered(adding, () => setAdding(false));
  const { push } = useNav();
  const { layout } = useSettings();
  const { toggleSlip, dialog: slipDialog } = useTodaysSlip();
  const signedOutNoteShown = useSignedOutNoteShown();
  const celebration = useCelebration(habits, day);
  /**
   * A habit's face, in the grid or the list. Its tick checks a build habit in today with one tap,
   * and its slip button asks before logging a quit habit's slip; the rest of it opens the habit.
   */
  const faceOf = (habit: Habit): HabitFaceProps => {
    const days = currentStreakDays(habit);
    return {
      name: habit.name,
      days,
      unit: counterLabel(habit, days),
      status: statusLabel(habit),
      kind: habit.kind,
      color: habit.color,
      onClick: () => push({ name: "detail", id: habit.id }),
      today: {
        logged: loggedToday(habit),
        locked: !canToggle(habit, day),
        onToggle: () =>
          habit.kind === "build" ? void store.toggleDay(habit.id) : toggleSlip(habit),
      },
    };
  };
  // a habit dragged to `to` goes just after the habit that ends up before it there
  const move = (from: number, to: number) => {
    const moved = habits[from];
    const rest = habits.filter((h) => h !== moved);
    if (moved) void store.moveHabit(moved.id, rest[to - 1]?.id ?? null);
  };
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
          <h1
            tabIndex={-1}
            className="mt-0.5 rounded-lg font-display text-4xl leading-[1.05] font-medium tracking-[-0.032em] focus-ring [font-stretch:96%]"
          >
            Habits
          </h1>
        </header>
        {/* one note at a time: keeping the habits safe comes before the reorder hint */}
        {signedOutNoteShown ? <SignedOutNote /> : <ReorderHint />}
        <div className="px-5 pb-5">
          {empty === "no habits" ? (
            <EmptyHabits onAdd={() => setAdding(true)} />
          ) : empty === "all archived" ? (
            <AllArchived
              layout={layout}
              onShowArchived={() => push({ name: "archived" })}
              onAdd={() => setAdding(true)}
            />
          ) : (
            <HabitCollection
              layout={layout}
              onMove={move}
              end={<NewHabitTile layout={layout} onClick={() => setAdding(true)} />}
            >
              {habits.map((habit) => {
                const Face = layout === "grid" ? HabitCard : HabitRow;
                return <Face key={habit.id} {...faceOf(habit)} />;
              })}
            </HabitCollection>
          )}
        </div>
      </ScreenScroll>
      <NewHabitDialog open={adding} onClose={() => setAdding(false)} />
      {slipDialog}
      {celebration}
    </>
  );
}

/**
 * Why Home has no habit to show, if it has none: the device has no habits at all, or every one
 * of them is archived. Deleted habits don't count.
 */
export function emptyHome(habits: Habit[], archived: Habit[]): "no habits" | "all archived" | null {
  if (habits.length > 0) return null;
  return archived.length > 0 ? "all archived" : "no habits";
}

function EmptyHabits({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      title="Nothing counted yet"
      action={
        <Button className="w-full" onClick={onAdd}>
          Add a habit
        </Button>
      }
    >
      Add a habit to build, like a morning run, or one to quit, like smoking.
    </EmptyState>
  );
}

/**
 * Home when every habit is archived: says so, with a way to Archived habits to restore one, and
 * the New habit tile where it always is, after the habits.
 */
function AllArchived({
  layout,
  onShowArchived,
  onAdd,
}: {
  layout: Layout;
  onShowArchived: () => void;
  onAdd: () => void;
}) {
  return (
    <>
      <EmptyState
        title="Every habit is archived"
        className="mb-5"
        action={
          <Button className="w-full" onClick={onShowArchived}>
            See archived habits
          </Button>
        }
      >
        Archived habits keep their history. Restore one to track it again, or start a new one.
      </EmptyState>
      <HabitCollection layout={layout} end={<NewHabitTile layout={layout} onClick={onAdd} />}>
        {null}
      </HabitCollection>
    </>
  );
}
