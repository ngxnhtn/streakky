import { useState } from "react";
import {
  canToggle,
  counterLabel,
  currentStreakDays,
  loggedToday,
  sinceLabel,
  todayISO,
} from "@streakky/core";
import { AppBar } from "@streakky/ui/components/app-bar";
import { Button } from "@streakky/ui/components/button";
import { HabitCalendar, type CalendarView } from "@streakky/ui/components/habit/calendar";
import { HabitGoal } from "@streakky/ui/components/habit/goal";
import { StreakRing } from "@streakky/ui/components/habit/ring";
import { HabitStats } from "@streakky/ui/components/habit/stats";
import { TodayButton } from "@streakky/ui/components/habit/today-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@streakky/ui/components/tabs";
import { ChevronLeft, Menu } from "lucide-react";
import { HabitDialogs, type HabitDialog } from "../parts/habit-dialogs.tsx";
import { useStore } from "../store.tsx";
import { ScreenScroll, useNav } from "./App.tsx";

const TABS = ["calendar", "stats", "goal"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { calendar: "Calendar", stats: "Stats", goal: "Goal" };

export function Detail({ id }: { id: string }) {
  const { habits, settings, dispatch } = useStore();
  const { pop } = useNav();
  const [tab, setTab] = useState<Tab>("calendar");
  const [view, setView] = useState<CalendarView>("weeks");
  const [dialog, setDialog] = useState<HabitDialog>(null);
  const habit = habits.find((s) => s.id === id);
  const back = (
    <Button variant="ghost" size="icon" aria-label="Back to habits" onClick={pop}>
      <ChevronLeft strokeWidth={1.75} />
    </Button>
  );
  if (!habit) {
    return (
      <>
        <AppBar left={back} />
        <p className="px-5 py-6 text-muted-foreground">This habit was deleted.</p>
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
            onClick={() => setDialog("options")}
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
            disabled={!canToggle(habit, todayISO())}
            onToggle={() => dispatch({ type: "toggle-day", id })}
            onSlip={() => setDialog("slip")}
          />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <div className="px-5 pt-2">
            <TabsList index={TABS.indexOf(tab)} count={TABS.length} aria-label="Habit details">
              {TABS.map((t) => (
                <TabsTrigger key={t} value={t}>
                  {TAB_LABEL[t]}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="calendar" className="min-h-[380px] px-5 pt-6">
            <HabitCalendar
              habit={habit}
              weekStart={settings.weekStart}
              view={view}
              onViewChange={setView}
              onToggleDay={(day) => dispatch({ type: "toggle-day", id, day })}
            />
          </TabsContent>
          <TabsContent value="stats" className="min-h-[380px] px-5 pt-6">
            <HabitStats habit={habit} />
          </TabsContent>
          <TabsContent value="goal" className="min-h-[380px] px-5 pt-6">
            <HabitGoal
              habit={habit}
              onGoalChange={(goal) => dispatch({ type: "goal", id, goal })}
            />
          </TabsContent>
        </Tabs>
      </ScreenScroll>
      <HabitDialogs
        habit={habit}
        dialog={dialog}
        setDialog={setDialog}
        onDelete={() => {
          pop();
          window.setTimeout(() => dispatch({ type: "delete", id }), 320);
        }}
      />
    </div>
  );
}
