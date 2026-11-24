import { useMemo, useState } from "react";
import { ChevronLeft, Menu } from "lucide-react";
import {
  canToggle,
  counterLabel,
  currentStreakDays,
  loggedToday,
  sinceLabel,
} from "@streakky/core";
import { AppBar } from "@streakky/ui/components/app-bar";
import { Button } from "@streakky/ui/components/button";
import { HabitCalendar, type CalendarView } from "@streakky/ui/components/habit/calendar";
import { HabitGoal } from "@streakky/ui/components/habit/goal";
import { StreakRing } from "@streakky/ui/components/habit/ring";
import { HabitStats } from "@streakky/ui/components/habit/stats";
import { TodayButton } from "@streakky/ui/components/habit/today-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@streakky/ui/components/tabs";
import { useHabit, useHabitStore, useSettings } from "../store/react.tsx";
import { useCelebration } from "./Celebration.tsx";
import { HabitOptions } from "./HabitOptions.tsx";
import { useTodaysSlip } from "./LogSlipDialog.tsx";
import { ScreenScroll, useInFront, useNav } from "./stack.tsx";
import { useToday } from "./use-today.ts";

const TABS = ["calendar", "stats", "goal"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { calendar: "Calendar", stats: "Stats", goal: "Goal" };

/**
 * One habit: its current streak and since when, today's check-in or slip, then its calendar
 * (where past days can be edited), its stats with every streak, and its goal. The app bar's
 * right-hand button opens its options, such as Edit habit.
 */
export function HabitDetail({ id }: { id: string }) {
  const store = useHabitStore();
  const habit = useHabit(id);
  const { weekStart } = useSettings();
  const day = useToday();
  const { pop } = useNav();
  const [tab, setTab] = useState<Tab>("calendar");
  const [view, setView] = useState<CalendarView>("weeks");
  const [options, setOptions] = useState(false);
  // the browser's back or forward button can leave the screen while the options are open
  const inFront = useInFront();
  if (!inFront && options) setOptions(false);
  const { toggleSlip, dialog: slipDialog } = useTodaysSlip();
  const shown = useMemo(() => (habit ? [habit] : []), [habit]);
  const celebration = useCelebration(shown, day);
  const back = (
    <Button variant="ghost" size="icon" aria-label="Back to habits" onClick={pop}>
      <ChevronLeft strokeWidth={1.75} />
    </Button>
  );
  if (!habit) {
    // say, a reload on a habit that has since gone
    return (
      <>
        <AppBar left={back} />
        <p className="px-5 py-6 text-muted-foreground">This habit is no longer here.</p>
      </>
    );
  }
  const days = currentStreakDays(habit);

  return (
    <div data-habit-color={habit.color} className="contents">
      <AppBar
        left={back}
        title={habit.name}
        right={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Habit options"
            aria-haspopup="dialog"
            onClick={() => setOptions(true)}
          >
            <Menu strokeWidth={1.75} />
          </Button>
        }
      />
      <ScreenScroll>
        <StreakRing
          days={days}
          goal={habit.goal}
          label={counterLabel(habit, days)}
          since={sinceLabel(habit)}
        />
        <div className="flex justify-center px-5 pt-1 pb-5">
          <TodayButton
            kind={habit.kind}
            loggedToday={loggedToday(habit)}
            disabled={!canToggle(habit, day)}
            onToggle={() => void store.toggleDay(habit.id)}
            onSlip={() => toggleSlip(habit)}
          />
        </div>
        <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
          <div className="px-5 pt-2">
            <TabsList index={TABS.indexOf(tab)} count={TABS.length} aria-label="Habit details">
              {TABS.map((t) => (
                <TabsTrigger key={t} value={t}>
                  {TAB_LABEL[t]}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="calendar" className="min-h-[23.75rem] px-5 pt-6">
            <HabitCalendar
              habit={habit}
              weekStart={weekStart}
              view={view}
              onViewChange={setView}
              onToggleDay={(pastDay) => void store.toggleDay(habit.id, pastDay)}
            />
          </TabsContent>
          <TabsContent value="stats" className="min-h-[23.75rem] px-5 pt-6">
            <HabitStats habit={habit} />
          </TabsContent>
          <TabsContent value="goal" className="min-h-[23.75rem] px-5 pt-6">
            <HabitGoal
              habit={habit}
              onGoalChange={(goal) => void store.editHabit(habit.id, { goal })}
            />
          </TabsContent>
        </Tabs>
      </ScreenScroll>
      <HabitOptions habit={habit} open={options} onClose={() => setOptions(false)} />
      {slipDialog}
      {celebration}
    </div>
  );
}
