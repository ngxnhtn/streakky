import { useState } from "react";
import {
  canToggle,
  counterLabel,
  currentStreakDays,
  fmtLong,
  loggedToday,
  sinceLabel,
  today,
  todayISO,
} from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import { Card, CardTitle } from "@streakky/ui/components/card";
import { PortalContainerProvider } from "@streakky/ui/components/portal";
import { HabitCalendar, type CalendarView } from "@streakky/ui/components/habit/calendar";
import { HabitGoal } from "@streakky/ui/components/habit/goal";
import { StreakRing } from "@streakky/ui/components/habit/ring";
import { HabitStats } from "@streakky/ui/components/habit/stats";
import { CheckInTick } from "@streakky/ui/components/habit/habit-card";
import { TodayButton } from "@streakky/ui/components/habit/today-button";
import { cn } from "@streakky/ui/lib/utils";
import { Plus } from "lucide-react";
import { EmptyHabits } from "../parts/empty.tsx";
import { NewHabitDialog } from "../parts/new-habit-dialog.tsx";
import { SettingsBody } from "../parts/settings-body.tsx";
import { ShapeContext } from "../parts/shape.tsx";
import { HabitDialogs, type HabitDialog } from "../parts/habit-dialogs.tsx";
import { LayoutSwitch, HabitFaces } from "../parts/habit-faces.tsx";
import { useStore } from "../store.tsx";

type Page = { name: "all" } | { name: "habit"; id: string } | { name: "settings" };

const sideItem =
  "flex min-h-11 w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-left text-sm font-medium outline-hidden transition-colors duration-120 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring hover-fine:not-aria-[current=page]:bg-accent active:bg-press aria-[current=page]:bg-muted";

/** The desktop web app: habits down the side, the chosen page in the main column. */
export function WebApp() {
  const { habits } = useStore();
  const [page, setPage] = useState<Page>({ name: "all" });
  const [adding, setAdding] = useState(false);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const isCurrent = (p: Page) =>
    p.name === page.name && (p.name !== "habit" || (page.name === "habit" && page.id === p.id))
      ? ("page" as const)
      : undefined;

  return (
    <ShapeContext.Provider value={{ shape: "center" }}>
      <PortalContainerProvider container={root}>
        <div
          ref={setRoot}
          className="grid h-dvh grid-cols-[272px_minmax(0,1fr)] bg-background text-[15px] text-foreground max-[900px]:grid-cols-[224px_minmax(0,1fr)]"
        >
          <aside className="flex min-h-0 flex-col gap-5 overflow-y-auto border-r border-border px-4 pt-6 pb-5">
            <p className="flex items-center gap-2 px-3 py-1 text-lg font-semibold tracking-[-0.025em]">
              <Logo />
              Streakky
            </p>
            <Button className="h-[46px] gap-1.5 text-[15px]" onClick={() => setAdding(true)}>
              <Plus strokeWidth={1.75} />
              New habit
            </Button>
            <nav aria-label="Habits">
              <button
                type="button"
                className={sideItem}
                aria-current={isCurrent({ name: "all" })}
                onClick={() => setPage({ name: "all" })}
              >
                <span className="flex-1">All habits</span>
                <span className="text-[13px] text-muted-foreground tabular-nums">
                  {habits.length}
                </span>
              </button>
              {habits.length > 0 && (
                <p className="mx-3 mt-[18px] mb-1.5 text-xs font-medium text-muted-foreground">
                  Your habits
                </p>
              )}
              <ul className="grid gap-0.5">
                {habits.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      data-habit-color={s.color}
                      className={sideItem}
                      aria-current={isCurrent({ name: "habit", id: s.id })}
                      onClick={() => setPage({ name: "habit", id: s.id })}
                    >
                      <span
                        aria-hidden="true"
                        className="size-2.5 flex-none rounded-full bg-habit"
                      />
                      <span className="min-w-0 flex-1 truncate">{s.name}</span>
                      {s.kind === "build" && (
                        <CheckInTick checkedIn={loggedToday(s)} className="size-4" />
                      )}
                      <span className="min-w-6 text-right text-[13px] text-muted-foreground tabular-nums">
                        {currentStreakDays(s)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-auto grid gap-1">
              <button
                type="button"
                className={sideItem}
                aria-current={isCurrent({ name: "settings" })}
                onClick={() => setPage({ name: "settings" })}
              >
                Settings
              </button>
              <a
                href="#"
                className="px-3 py-2 font-mono text-xs text-muted-foreground underline decoration-input underline-offset-4 hover-fine:text-foreground hover-fine:decoration-current"
              >
                View the mobile demo
              </a>
            </div>
          </aside>

          <main className="min-w-0 overflow-y-auto overscroll-contain">
            {page.name === "all" && (
              <AllPage
                onOpen={(id) => setPage({ name: "habit", id })}
                onAdd={() => setAdding(true)}
              />
            )}
            {page.name === "habit" && (
              <HabitPage key={page.id} id={page.id} onGone={() => setPage({ name: "all" })} />
            )}
            {page.name === "settings" && (
              <Page title="Settings">
                <SettingsBody className="max-w-[560px] [&_[data-slot=list-group]:first-child]:mt-0" />
              </Page>
            )}
          </main>
          <NewHabitDialog open={adding} onClose={() => setAdding(false)} />
        </div>
      </PortalContainerProvider>
    </ShapeContext.Provider>
  );
}

function Logo() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
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

function Page({
  eyebrow,
  title,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1180px] px-12 pt-10 pb-[72px] max-[900px]:px-7 max-[900px]:pt-7">
      <header className="mb-7 flex items-end justify-between gap-6">
        <div>
          {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
          <h1 className="mt-0.5 font-display text-[40px] leading-[1.05] font-medium tracking-[-0.035em] [font-stretch:96%]">
            {title}
          </h1>
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}

function AllPage({ onOpen, onAdd }: { onOpen: (id: string) => void; onAdd: () => void }) {
  const { habits } = useStore();
  return (
    <Page eyebrow={fmtLong(today())} title="Habits" actions={habits.length > 0 && <LayoutSwitch />}>
      {habits.length === 0 ? (
        <EmptyHabits onAdd={onAdd} />
      ) : (
        <HabitFaces
          onOpen={onOpen}
          onAdd={onAdd}
          className="data-[layout=grid]:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] data-[layout=grid]:gap-3 data-[layout=list]:grid-cols-[repeat(auto-fill,minmax(380px,1fr))] data-[layout=grid]:[&_[data-slot=new-habit]]:h-[184px] [&_[data-slot=habit-card]]:h-[184px]"
        />
      )}
    </Page>
  );
}

/** One habit with everything in view: the count and today's action, then calendar, stats and goal. */
function HabitPage({ id, onGone }: { id: string; onGone: () => void }) {
  const { habits, settings, dispatch } = useStore();
  const [dialog, setDialog] = useState<HabitDialog>(null);
  const [view, setView] = useState<CalendarView>("weeks");
  const habit = habits.find((s) => s.id === id);
  if (!habit) {
    return (
      <Page title="Habit">
        <p className="text-muted-foreground">This habit was deleted.</p>
      </Page>
    );
  }
  const days = currentStreakDays(habit);

  return (
    <div data-habit-color={habit.color}>
      <Page
        eyebrow={habit.kind === "build" ? "Habit to build" : "Habit to quit"}
        title={habit.name}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setDialog("edit")}>
              Edit
            </Button>
            <Button size="sm" variant="outline-destructive" onClick={() => setDialog("delete")}>
              Delete
            </Button>
          </div>
        }
      >
        <div
          className={cn(
            "grid gap-4",
            "grid-cols-[minmax(300px,340px)_minmax(0,1fr)] [grid-template-areas:'hero_cal'_'goal_stats']",
            "max-[1100px]:grid-cols-1 max-[1100px]:[grid-template-areas:'hero'_'cal'_'stats'_'goal']",
          )}
        >
          <Card
            aria-label="This streak"
            className="flex flex-col items-center justify-center px-4 pt-7 pb-3 [grid-area:hero]"
          >
            <StreakRing
              days={days}
              goal={habit.goal}
              label={counterLabel(habit, days)}
              since={sinceLabel(habit)}
            />
            <div className="flex justify-center px-5 pt-1 pb-3">
              <TodayButton
                kind={habit.kind}
                loggedToday={loggedToday(habit)}
                disabled={!canToggle(habit, todayISO())}
                onToggle={() => dispatch({ type: "toggle-day", id })}
                onSlip={() => setDialog("slip")}
              />
            </div>
          </Card>
          <Card className="[grid-area:cal]">
            <CardTitle>Calendar</CardTitle>
            <HabitCalendar
              habit={habit}
              weekStart={settings.weekStart}
              view={view}
              onViewChange={setView}
              minWeeks={53}
              onToggleDay={(day) => dispatch({ type: "toggle-day", id, day })}
            />
          </Card>
          <Card className="[grid-area:stats]">
            <CardTitle>Stats</CardTitle>
            <HabitStats habit={habit} tilesClassName="grid-cols-4 max-[900px]:grid-cols-2" />
          </Card>
          <Card className="[grid-area:goal]">
            <CardTitle>Goal</CardTitle>
            <HabitGoal
              habit={habit}
              onGoalChange={(goal) => dispatch({ type: "goal", id, goal })}
            />
          </Card>
        </div>
      </Page>
      <HabitDialogs
        habit={habit}
        dialog={dialog}
        setDialog={setDialog}
        onDelete={() => {
          onGone();
          dispatch({ type: "delete", id });
        }}
      />
    </div>
  );
}
