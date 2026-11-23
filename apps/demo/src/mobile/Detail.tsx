import { useState } from "react";
import {
  canToggle,
  counterLabel,
  currentDays,
  markedToday,
  sinceLabel,
  todayISO,
} from "@streakky/core";
import { AppBar } from "@streakky/ui/components/app-bar";
import { Button } from "@streakky/ui/components/button";
import { StreakCalendar, type CalendarView } from "@streakky/ui/components/streak/calendar";
import { StreakGoal } from "@streakky/ui/components/streak/goal";
import { StreakRing } from "@streakky/ui/components/streak/ring";
import { StreakStats } from "@streakky/ui/components/streak/stats";
import { TodayButton } from "@streakky/ui/components/streak/today-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@streakky/ui/components/tabs";
import { ChevronLeft, Menu } from "lucide-react";
import { StreakDialogs, type StreakDialog } from "../parts/streak-dialogs.tsx";
import { useStore } from "../store.tsx";
import { ScreenScroll, useNav } from "./App.tsx";

const TABS = ["calendar", "stats", "goal"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { calendar: "Calendar", stats: "Stats", goal: "Goal" };

export function Detail({ id }: { id: string }) {
  const { streaks, settings, dispatch } = useStore();
  const { pop } = useNav();
  const [tab, setTab] = useState<Tab>("calendar");
  const [view, setView] = useState<CalendarView>("weeks");
  const [dialog, setDialog] = useState<StreakDialog>(null);
  const streak = streaks.find((s) => s.id === id);
  const back = (
    <Button variant="ghost" size="icon" aria-label="Back to streaks" onClick={pop}>
      <ChevronLeft strokeWidth={1.75} />
    </Button>
  );
  if (!streak) {
    return (
      <>
        <AppBar left={back} />
        <p className="px-5 py-6 text-muted-foreground">This streak was deleted.</p>
      </>
    );
  }
  const days = currentDays(streak);

  return (
    <div data-streak-color={streak.color} className="contents">
      <AppBar
        left={back}
        title={streak.name}
        right={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Streak options"
            onClick={() => setDialog("options")}
          >
            <Menu strokeWidth={1.75} />
          </Button>
        }
      />
      <ScreenScroll>
        <StreakRing
          days={days}
          goal={streak.goal}
          label={counterLabel(streak, days)}
          since={sinceLabel(streak)}
        />
        <div className="flex justify-center px-5 pt-1 pb-5">
          <TodayButton
            mode={streak.mode}
            marked={markedToday(streak)}
            disabled={!canToggle(streak, todayISO())}
            onToggle={() => dispatch({ type: "toggle-day", id })}
            onSlip={() => setDialog("slip")}
          />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <div className="px-5 pt-2">
            <TabsList index={TABS.indexOf(tab)} count={TABS.length} aria-label="Streak details">
              {TABS.map((t) => (
                <TabsTrigger key={t} value={t}>
                  {TAB_LABEL[t]}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="calendar" className="min-h-[380px] px-5 pt-6">
            <StreakCalendar
              streak={streak}
              weekStart={settings.weekStart}
              view={view}
              onViewChange={setView}
              onToggleDay={(day) => dispatch({ type: "toggle-day", id, day })}
            />
          </TabsContent>
          <TabsContent value="stats" className="min-h-[380px] px-5 pt-6">
            <StreakStats streak={streak} />
          </TabsContent>
          <TabsContent value="goal" className="min-h-[380px] px-5 pt-6">
            <StreakGoal
              streak={streak}
              onGoalChange={(goal) => dispatch({ type: "goal", id, goal })}
            />
          </TabsContent>
        </Tabs>
      </ScreenScroll>
      <StreakDialogs
        streak={streak}
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
