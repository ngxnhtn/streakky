import { useEffect, useRef } from "react";
import { ArchiveRestore, ChevronLeft } from "lucide-react";
import { longestStreakDays, plural, type Habit } from "@streakky/core";
import { AppBar } from "@streakky/ui/components/app-bar";
import { Button } from "@streakky/ui/components/button";
import { List } from "@streakky/ui/components/list";
import { cn } from "@streakky/ui/lib/utils";
import { useArchivedHabits, useHabitStore } from "../store/react.tsx";
import { keepFocus, neighbourOfFocus } from "./focus.ts";
import { ScreenScroll, useNav, useScreenBelow } from "./stack.tsx";

/**
 * Archived habits, reached from Settings, or from Home when every habit is archived: hidden from
 * Home, with their history kept. Each one opens its Habit detail to look back on, and restoring
 * one brings it back to Home.
 */
export function ArchivedHabits() {
  const { push, pop } = useNav();
  const fromHome = useScreenBelow()?.name === "home";
  const store = useHabitStore();
  const habits = useArchivedHabits();

  // when the last one goes while it has focus, say restored, focus goes to the note saying so
  const none = useRef<HTMLDivElement>(null);
  const hadSome = useRef(habits.length > 0);
  useEffect(() => {
    if (habits.length === 0 && hadSome.current && document.activeElement === document.body) {
      none.current?.focus({ preventScroll: true });
    }
    hadSome.current = habits.length > 0;
  }, [habits.length]);

  return (
    <>
      <AppBar
        left={
          <Button
            variant="ghost"
            size="icon"
            aria-label={fromHome ? "Back to habits" : "Back to settings"}
            onClick={pop}
          >
            <ChevronLeft strokeWidth={1.75} />
          </Button>
        }
        title="Archived habits"
      />
      <ScreenScroll>
        <div className="px-5 pt-2">
          {habits.length === 0 ? (
            <div
              ref={none}
              tabIndex={-1}
              className="max-w-[30rem] rounded-3xl bg-muted px-6 pt-7 pb-6 focus-ring"
            >
              <p className="text-xl font-medium tracking-[-0.015em]">Nothing archived</p>
              <p className="mt-1.5 text-muted-foreground">
                Archive a habit from its options when you stop tracking it. It leaves Home and waits
                here, history and all, until you restore it.
              </p>
            </div>
          ) : (
            <>
              <p className="mx-1 mb-4 text-sm text-muted-foreground">
                Hidden from Home, with every check-in and slip kept. Restore one to track it again.
              </p>
              <List aria-label="Archived habits">
                {habits.map((habit) => (
                  <ArchivedRow
                    key={habit.id}
                    habit={habit}
                    onOpen={() => push({ name: "detail", id: habit.id })}
                    onRestore={() =>
                      void keepFocus(() => store.restoreHabit(habit.id), neighbourOfFocus())
                    }
                  />
                ))}
              </List>
            </>
          )}
        </div>
      </ScreenScroll>
    </>
  );
}

/**
 * One archived habit: its colour, name and longest streak, opening its Habit detail, and a
 * Restore button of its own.
 */
function ArchivedRow({
  habit,
  onOpen,
  onRestore,
}: {
  habit: Habit;
  onOpen: () => void;
  onRestore: () => void;
}) {
  const longest = plural(longestStreakDays(habit), "day");
  return (
    <li
      data-habit-color={habit.color}
      className="relative flex min-h-16 items-center gap-3.5 py-2.5 pr-2.5 pl-4"
    >
      <button
        type="button"
        data-slot="archived-habit"
        onClick={onOpen}
        aria-label={`${habit.name}, longest streak ${longest}`}
        className={cn(
          "absolute inset-0 transition-colors duration-120 ease-ui",
          "hover-fine:bg-accent hover-fine:duration-150 active:bg-press active:duration-90",
          // the ring sits inside the row; at the list's ends it follows the list's rounded corners
          "focus-ring-flush focus-visible:-outline-offset-2",
          "in-[li:first-child]:rounded-t-[1.25rem] in-[li:last-child]:rounded-b-[1.25rem]",
        )}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none relative size-2.5 flex-none rounded-full bg-habit"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none relative flex min-w-0 flex-1 flex-col gap-0.5"
      >
        <span className="truncate text-[0.9375rem] font-medium">{habit.name}</span>
        <span className="text-[0.8125rem] text-muted-foreground">Longest streak {longest}</span>
      </span>
      <Button
        data-slot="restore-habit"
        variant="outline"
        size="sm"
        aria-label={`Restore ${habit.name}`}
        onClick={onRestore}
        className="hover-fine:bg-accent"
      >
        Restore
      </Button>
    </li>
  );
}

/**
 * On an archived habit's Habit detail, in place of today's button: what archiving did, and a way
 * to undo it. Once restored, today's button takes its place, and focus with it.
 */
export function ArchivedNote({ habit }: { habit: Habit }) {
  const store = useHabitStore();
  const note = useRef<HTMLDivElement>(null);
  return (
    <div ref={note} className="flex flex-col items-center gap-3">
      <p className="text-center text-[0.8125rem] text-muted-foreground">
        Archived: hidden from Home, with its history kept.
      </p>
      <Button
        variant="habit"
        className="min-w-[13.75rem]"
        onClick={() => {
          const spot = note.current?.parentElement;
          void keepFocus(
            () => store.restoreHabit(habit.id),
            () => spot?.querySelector("button") ?? null,
          );
        }}
      >
        <ArchiveRestore strokeWidth={1.75} />
        Restore habit
      </Button>
    </div>
  );
}
