import { useState } from "react";
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
import { StreakRing } from "@streakky/ui/components/habit/ring";
import { HabitStats } from "@streakky/ui/components/habit/stats";
import { TodayButton } from "@streakky/ui/components/habit/today-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@streakky/ui/components/tabs";
import { useArchivedHabit, useHabit, useHabitStore, useSettings } from "../store/react.tsx";
import { ArchivedNote } from "./ArchivedHabits.tsx";
import { HabitOptions, type HabitDialog } from "./HabitOptions.tsx";
import { useTodaysSlip } from "./LogSlipDialog.tsx";
import { ScreenScroll, useNav } from "./stack.tsx";
import { useToday } from "./use-today.ts";

const TABS = ["calendar", "stats"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { calendar: "Calendar", stats: "Stats" };

/**
 * One habit: its current streak and since when, today's check-in or slip, then its calendar
 * (where past days can be edited) and its stats with every streak. An archived habit shows the
 * same history, but its days stay as they are until it's restored.
 */
export function HabitDetail({ id }: { id: string }) {
  const store = useHabitStore();
  const active = useHabit(id);
  const archivedHabit = useArchivedHabit(id);
  const habit = active ?? archivedHabit;
  const archived = active === undefined;
  const { weekStart } = useSettings();
  const day = useToday();
  const { pop } = useNav();
  const [tab, setTab] = useState<Tab>("calendar");
  const [view, setView] = useState<CalendarView>("weeks");
  const { toggleSlip, dialog: slipDialog } = useTodaysSlip();
  const [dialog, setDialog] = useState<HabitDialog>(null);
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
          // an archived habit can't be checked in, so it isn't asked to
          since={
            archived && habit.kind === "build" && days === 0
              ? "no current streak"
              : sinceLabel(habit)
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
              onToggle={() => void store.toggleDay(habit.id)}
              onSlip={() => toggleSlip(habit)}
            />
          )}
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
              onToggleDay={
                archived ? undefined : (pastDay) => void store.toggleDay(habit.id, pastDay)
              }
            />
          </TabsContent>
          <TabsContent value="stats" className="min-h-[23.75rem] px-5 pt-6">
            <HabitStats habit={habit} />
          </TabsContent>
        </Tabs>
      </ScreenScroll>
      {slipDialog}
      <HabitOptions habit={habit} archived={archived} dialog={dialog} setDialog={setDialog} />
    </div>
  );
}
