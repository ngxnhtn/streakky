import type { ComponentProps } from "react";
import { Plus } from "lucide-react";
import { counterLabel, currentStreakDays, loggedToday, type Habit } from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import { CheckInTick } from "@streakky/ui/components/habit/habit-card";
import { useHabits } from "../store/react.tsx";
import { useOpenNewHabit } from "./NewHabitDialog.tsx";
import { sameRoute, useNav, useShownScreens, type Route } from "./stack.tsx";

const sidebarItem =
  "flex min-h-11 w-full items-center gap-2.5 rounded-[0.875rem] px-3 py-2 text-left text-sm font-medium transition-colors duration-120 focus-ring-flush hover-fine:not-aria-[current=page]:bg-accent active:bg-press aria-[current=page]:bg-muted";

/**
 * The desktop layout's sidebar: New habit, then its pages, All habits and each active habit with
 * its count and today's tick, and Settings at the foot. The page showing is marked as current.
 */
export function Sidebar() {
  const habits = useHabits();
  const openNewHabit = useOpenNewHabit();
  const { go } = useNav();
  // the sidebar's page: the first screen over Home, so Sign in over Settings keeps Settings
  const page: Route = useShownScreens().screens[0] ?? { name: "home" };
  const current = (route: Route) => (sameRoute(page, route) ? ("page" as const) : undefined);

  return (
    <div className="flex min-h-full flex-col gap-5 px-4 pt-6 pb-5">
      <p className="flex items-center gap-2 px-3 py-1 text-lg font-semibold tracking-[-0.025em]">
        <Logo />
        Streakky
      </p>
      <Button className="h-[2.875rem] gap-1.5 text-[0.9375rem]" onClick={openNewHabit}>
        <Plus strokeWidth={1.75} />
        New habit
      </Button>
      <nav aria-label="Habits">
        <SidebarButton current={current({ name: "home" })} onClick={() => go({ name: "home" })}>
          <span className="flex-1">All habits</span>
          <span className="text-[0.8125rem] text-muted-foreground tabular-nums">
            {habits.length}
          </span>
        </SidebarButton>
        {habits.length > 0 && (
          <>
            <h2 className="mx-3 mt-[1.125rem] mb-1.5 text-xs font-medium text-muted-foreground">
              Your habits
            </h2>
            <ul className="grid gap-0.5">
              {habits.map((habit) => (
                <li key={habit.id}>
                  <HabitItem
                    habit={habit}
                    current={current({ name: "detail", id: habit.id })}
                    onClick={() => go({ name: "detail", id: habit.id })}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>
      <div className="mt-auto">
        <SidebarButton
          current={current({ name: "settings" })}
          onClick={() => go({ name: "settings" })}
        >
          Settings
        </SidebarButton>
      </div>
    </div>
  );
}

/** One of the sidebar's pages, marked while it shows. */
function SidebarButton({
  current,
  ...props
}: Omit<ComponentProps<"button">, "type" | "className"> & { current: "page" | undefined }) {
  return <button type="button" className={sidebarItem} aria-current={current} {...props} />;
}

/**
 * A habit in the sidebar: its colour, its name, today's tick on a build habit, and its count. Its
 * name says what the count and the tick show.
 */
function HabitItem({
  habit,
  current,
  onClick,
}: {
  habit: Habit;
  current: "page" | undefined;
  onClick: () => void;
}) {
  const days = currentStreakDays(habit);
  const checkedIn = habit.kind === "build" && loggedToday(habit);
  return (
    <SidebarButton
      data-habit-color={habit.color}
      current={current}
      aria-label={`${habit.name}, ${days} ${counterLabel(habit, days)}${checkedIn ? ", checked in today" : ""}`}
      onClick={onClick}
    >
      <span aria-hidden="true" className="size-2.5 flex-none rounded-full bg-habit" />
      <span className="min-w-0 flex-1 truncate">{habit.name}</span>
      {habit.kind === "build" && <CheckInTick checkedIn={checkedIn} className="size-4" />}
      <span className="min-w-6 text-right text-[0.8125rem] text-muted-foreground tabular-nums">
        {days}
      </span>
    </SidebarButton>
  );
}

/** Streakky's mark: the ring's open arc. */
function Logo() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <path d="M5.64 18.36A9 9 0 1 1 18.36 18.36" />
    </svg>
  );
}
