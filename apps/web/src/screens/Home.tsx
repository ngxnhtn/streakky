import type { ReactNode } from "react";
import { LayoutGrid, Menu, Plus, Rows2 } from "lucide-react";
import {
  canToggle,
  counterLabel,
  currentStreakDays,
  fmtLong,
  fromISO,
  LAYOUTS,
  loggedToday,
  statusLabel,
  type Habit,
  type Layout,
} from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import { EmptyState } from "@streakky/ui/components/empty-state";
import {
  HabitCard,
  HabitCollection,
  HabitRow,
  NewHabitTile,
  type HabitFaceProps,
} from "@streakky/ui/components/habit/habit-card";
import { Segmented } from "@streakky/ui/components/segmented";
import { useArchivedHabits, useHabitStore, useHabits, useSettings } from "../store/react.tsx";
import { useCelebration } from "./Celebration.tsx";
import { useDesktop } from "./desktop.tsx";
import { useTodaysSlip } from "./LogSlipDialog.tsx";
import { useOpenNewHabit } from "./NewHabitDialog.tsx";
import { ReorderHint } from "./ReorderHint.tsx";
import { Screen } from "./screen.tsx";
import { SignedOutNote, useSignedOutNoteShown } from "./SignedOutNote.tsx";
import { useNav } from "./stack.tsx";
import { useToday } from "./use-today.ts";

/** The desktop's wider cards and rows: the grid's cards taller, the list in two columns. */
const DESKTOP_COLLECTION = [
  "data-[layout=grid]:grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] data-[layout=grid]:gap-3",
  "data-[layout=list]:grid-cols-[repeat(auto-fill,minmax(23.75rem,1fr))]",
  "[&_[data-slot=habit-card]]:h-[11.5rem] data-[layout=grid]:[&_[data-slot=new-habit]]:h-[11.5rem]",
].join(" ");

export function Home() {
  const store = useHabitStore();
  const habits = useHabits();
  const empty = emptyHome(habits, useArchivedHabits());
  const day = useToday();
  const openNewHabit = useOpenNewHabit();
  const { push } = useNav();
  const { layout } = useSettings();
  const desktop = useDesktop();
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
      <Screen
        eyebrow={fmtLong(fromISO(day))}
        title="Habits"
        bigTitle
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
          <Button variant="ring" size="icon" aria-label="New habit" onClick={openNewHabit}>
            <Plus strokeWidth={1.75} />
          </Button>
        }
        actions={empty === null && <LayoutSwitch layout={layout} />}
      >
        {/* one note at a time: keeping the habits safe comes before the reorder hint */}
        {signedOutNoteShown ? <SignedOutNote /> : <ReorderHint />}
        <div className="px-5 pb-5">
          {empty === "no habits" ? (
            <EmptyHabits onAdd={openNewHabit} />
          ) : empty === "all archived" ? (
            <AllArchived
              layout={layout}
              className={desktop ? DESKTOP_COLLECTION : undefined}
              onShowArchived={() => push({ name: "archived" })}
              onAdd={openNewHabit}
            />
          ) : (
            <HabitCollection
              layout={layout}
              className={desktop ? DESKTOP_COLLECTION : undefined}
              onMove={move}
              end={<NewHabitTile layout={layout} onClick={openNewHabit} />}
            >
              {habits.map((habit) => {
                const Face = layout === "grid" ? HabitCard : HabitRow;
                return <Face key={habit.id} {...faceOf(habit)} />;
              })}
            </HabitCollection>
          )}
        </div>
      </Screen>
      {slipDialog}
      {celebration}
    </>
  );
}

const LAYOUT_ICONS: Record<Layout, ReactNode> = {
  grid: <LayoutGrid strokeWidth={1.75} />,
  list: <Rows2 strokeWidth={1.75} />,
};

/** Desktop: Home's grid or list, beside its heading; Settings has the same choice. */
function LayoutSwitch({ layout }: { layout: Layout }) {
  const store = useHabitStore();
  return (
    <Segmented<Layout>
      size="xs"
      label="Home layout"
      value={layout}
      onValueChange={(next) => store.changeSettings({ layout: next })}
      className="mb-0.5 w-[5.75rem] flex-none"
      options={LAYOUTS.map(({ id, name }) => ({ value: id, label: name, icon: LAYOUT_ICONS[id] }))}
    />
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
  className,
  onShowArchived,
  onAdd,
}: {
  layout: Layout;
  className?: string;
  onShowArchived: () => void;
  onAdd: () => void;
}) {
  return (
    <>
      {/* takes focus when the last habit's card goes from under it, as by archiving it */}
      <EmptyState
        title="Every habit is archived"
        tabIndex={-1}
        className="mb-5 focus-ring"
        action={
          <Button className="w-full" onClick={onShowArchived}>
            See archived habits
          </Button>
        }
      >
        Archived habits keep their history. Restore one to track it again, or start a new one.
      </EmptyState>
      <HabitCollection
        layout={layout}
        className={className}
        end={<NewHabitTile layout={layout} onClick={onAdd} />}
      >
        {null}
      </HabitCollection>
    </>
  );
}
