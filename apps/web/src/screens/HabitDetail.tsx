import { useMemo, useRef, useState } from "react";
import { Menu } from "lucide-react";
import {
  canToggle,
  counterLabel,
  currentStreakDays,
  loggedToday,
  sinceLabel,
  type Habit,
} from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import { Card, CardTitle } from "@streakky/ui/components/card";
import { HabitCalendar, type CalendarView } from "@streakky/ui/components/habit/calendar";
import { HabitGoal } from "@streakky/ui/components/habit/goal";
import { StreakRing } from "@streakky/ui/components/habit/ring";
import { HabitStats } from "@streakky/ui/components/habit/stats";
import { TodayButton } from "@streakky/ui/components/habit/today-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@streakky/ui/components/tabs";
import { KIND_COPY } from "@streakky/ui/lib/kind-copy";
import { cn } from "@streakky/ui/lib/utils";
import { useArchivedHabit, useHabit, useHabitStore, useSettings } from "../store/react.tsx";
import { ArchivedNote } from "./ArchivedHabits.tsx";
import { useCelebration } from "./Celebration.tsx";
import { useHabitOptions } from "./HabitOptions.tsx";
import { useDesktop } from "./desktop.tsx";
import { useTodaysSlip } from "./LogSlipDialog.tsx";
import { Screen } from "./screen.tsx";
import { useToday } from "./use-today.ts";

const TABS = ["calendar", "stats", "goal"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { calendar: "Calendar", stats: "Stats", goal: "Goal" };
/** An archived habit keeps its goal as it was until it's restored, so it has no Goal tab. */
const ARCHIVED_TABS: readonly Tab[] = ["calendar", "stats"];

/**
 * One habit: its current streak and since when, today's check-in or slip, then its calendar
 * (where past days can be edited), its stats with every streak, and its goal. In the phone layout
 * the last three are tabs, and the app bar's right-hand button opens its options, such as Edit
 * habit; on the desktop they're cards side by side, with the options as buttons by the heading.
 * An archived habit shows the same history, but it stays as it is, days, goal and all, until it's
 * restored.
 */
export function HabitDetail({ id }: { id: string }) {
  const store = useHabitStore();
  const active = useHabit(id);
  const archivedHabit = useArchivedHabit(id);
  const habit = active ?? archivedHabit;
  const archived = active === undefined;
  const desktop = useDesktop();
  const { weekStart } = useSettings();
  const day = useToday();
  const [chosenTab, setTab] = useState<Tab>("calendar");
  const tabs = archived ? ARCHIVED_TABS : TABS;
  const tab = tabs.includes(chosenTab) ? chosenTab : "calendar";
  const [view, setView] = useState<CalendarView>("weeks");
  const { toggleSlip, dialog: slipDialog } = useTodaysSlip();
  const optionsButton = useRef<HTMLButtonElement>(null);
  const { showSheet, options, dialogs } = useHabitOptions({ habit, archived, optionsButton });
  // an archived habit's goal waits, like its days, until it's restored
  const shown = useMemo(() => (active ? [active] : []), [active]);
  const celebration = useCelebration(shown, day);
  if (!habit) {
    // say, a reload on a habit that has since gone
    return (
      <Screen>
        <p className="px-5 py-6 text-muted-foreground">This habit is no longer here.</p>
      </Screen>
    );
  }

  const today = (
    <HabitToday
      habit={habit}
      archived={archived}
      day={day}
      onToggle={() => void store.toggleDay(habit.id)}
      onSlip={() => toggleSlip(habit)}
    />
  );
  const calendar = (
    <HabitCalendar
      habit={habit}
      weekStart={weekStart}
      view={view}
      onViewChange={setView}
      // a year of weeks fits beside the ring on the desktop
      minWeeks={desktop ? 53 : undefined}
      onToggleDay={archived ? undefined : (pastDay) => void store.toggleDay(habit.id, pastDay)}
    />
  );
  const goal = (
    <HabitGoal habit={habit} onGoalChange={(goal) => void store.editHabit(habit.id, { goal })} />
  );

  return (
    <div data-habit-color={habit.color} className="contents">
      <Screen
        eyebrow={archived ? "Archived habit" : KIND_COPY[habit.kind].kindName}
        title={habit.name}
        right={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Habit options"
            aria-haspopup="dialog"
            ref={optionsButton}
            onClick={showSheet}
          >
            <Menu strokeWidth={1.75} />
          </Button>
        }
        actions={options.map((option) => (
          <Button
            key={option.label}
            size="sm"
            variant={option.destructive ? "outline-destructive" : "outline"}
            aria-haspopup={option.opensDialog ? "dialog" : undefined}
            onClick={option.choose}
          >
            {option.label}
          </Button>
        ))}
      >
        {desktop ? (
          <div
            className={cn(
              "grid gap-4 px-5",
              "grid-cols-[minmax(18.75rem,21.25rem)_minmax(0,1fr)]",
              archived
                ? "[grid-template-areas:'today_calendar'_'stats_stats']"
                : "[grid-template-areas:'today_calendar'_'goal_stats']",
              "max-[68.75rem]:grid-cols-1 max-[68.75rem]:[grid-template-areas:'today'_'calendar'_'stats'_'goal']",
            )}
          >
            <Card
              aria-label="Today"
              className="flex flex-col items-center justify-center px-4 pt-7 pb-3 [grid-area:today]"
            >
              {today}
            </Card>
            <Card className="[grid-area:calendar]">
              <CardTitle>Calendar</CardTitle>
              {calendar}
            </Card>
            <Card className="[grid-area:stats]">
              <CardTitle>Stats</CardTitle>
              <HabitStats habit={habit} tilesClassName="grid-cols-4 max-[56.25rem]:grid-cols-2" />
            </Card>
            {!archived && (
              <Card className="[grid-area:goal]">
                <CardTitle>Goal</CardTitle>
                {goal}
              </Card>
            )}
          </div>
        ) : (
          <div>
            {today}
            <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
              <div className="px-5 pt-2">
                <TabsList index={tabs.indexOf(tab)} count={tabs.length} aria-label="Habit details">
                  {tabs.map((t) => (
                    <TabsTrigger key={t} value={t}>
                      {TAB_LABEL[t]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <TabsContent value="calendar" className="min-h-[23.75rem] px-5 pt-6">
                {calendar}
              </TabsContent>
              <TabsContent value="stats" className="min-h-[23.75rem] px-5 pt-6">
                <HabitStats habit={habit} />
              </TabsContent>
              {!archived && (
                <TabsContent value="goal" className="min-h-[23.75rem] px-5 pt-6">
                  {goal}
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </Screen>
      {slipDialog}
      {dialogs}
      {celebration}
    </div>
  );
}

/**
 * The current streak in its ring, and under it today's check-in or slip, or on an archived habit
 * the note saying it's archived.
 */
function HabitToday({
  habit,
  archived,
  day,
  onToggle,
  onSlip,
}: {
  habit: Habit;
  archived: boolean;
  /** today, YYYY-MM-DD */
  day: string;
  onToggle: () => void;
  onSlip: () => void;
}) {
  const days = currentStreakDays(habit);
  return (
    <>
      <StreakRing
        days={days}
        goal={habit.goal}
        label={counterLabel(habit, days)}
        // An archived habit has no streak going at 0 days: a build habit can't be checked in, and
        // a quit habit's count is held, so neither is asked to start or said to have started
        // today. A slip logged today, before it was archived, still says so.
        since={
          archived && days === 0 && !loggedToday(habit) ? "no current streak" : sinceLabel(habit)
        }
      />
      <div className="flex justify-center px-5 pt-1 pb-5">
        {archived ? (
          <ArchivedNote habit={habit} />
        ) : (
          <TodayButton
            kind={habit.kind}
            loggedToday={loggedToday(habit)}
            disabled={!canToggle(habit, day)}
            onToggle={onToggle}
            onSlip={onSlip}
          />
        )}
      </div>
    </>
  );
}
