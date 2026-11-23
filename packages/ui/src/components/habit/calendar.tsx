import { useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  canToggle,
  fmtShort,
  fromISO,
  historyStart,
  daysByStreak,
  loggedDays,
  loggedToday,
  today,
  toISO,
  type Habit,
  type WeekStart,
} from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import { Segmented } from "@streakky/ui/components/segmented";
import { cn } from "@streakky/ui/lib/utils";

export type CalendarView = "weeks" | "month";

const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const monthShort = new Intl.DateTimeFormat("en-GB", { month: "short" });
const LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const rotate = <T,>(list: T[], weekStart: WeekStart) =>
  weekStart === 1 ? [...list.slice(1), list[0]] : list;
const startOfWeek = (d: Date, weekStart: WeekStart) =>
  addDays(d, -((d.getDay() - weekStart + 7) % 7));

type DayInfo = {
  date: Date;
  inStreak: boolean;
  slip: boolean;
  isToday: boolean;
  pending: boolean;
  editable: boolean;
};

/**
 * A habit's days. Every check-in or clean day takes the habit colour in full; a slip is an
 * unfilled day with a dot; today, not checked in yet, is a ring. Weeks: columns are weeks, newest
 * on the right, opening on today. Month: a classic grid with streaks drawn as bands.
 * "Edit days" turns days into buttons that call onToggleDay.
 */
export function HabitCalendar({
  habit,
  weekStart,
  view,
  onViewChange,
  onToggleDay,
  minWeeks = 16,
  className,
}: {
  habit: Habit;
  weekStart: WeekStart;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onToggleDay: (iso: string) => void;
  /** weeks the Weeks view shows at least, before its history began if need be */
  minWeeks?: number;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  // not memoised on the habit: a quit habit's clean days grow at midnight while the habit stays the same
  const streakDayMap = daysByStreak(habit);
  const t = today();
  const todayISO = toISO(t);
  // only the logged days that count: a slip on or before the quit day draws no dot
  const slips = new Set(habit.kind === "quit" ? loggedDays(habit) : []);
  const pending = habit.kind === "build" && !loggedToday(habit);
  const firstDay = fromISO(historyStart(habit));

  const info = (date: Date): DayInfo => {
    const iso = toISO(date);
    return {
      date,
      inStreak: streakDayMap.has(iso),
      slip: slips.has(iso),
      isToday: iso === todayISO,
      pending,
      editable: canToggle(habit, iso),
    };
  };
  const cell = { editing, kind: habit.kind, onToggleDay };

  return (
    <div data-slot="habit-calendar" className={className}>
      <div className="mb-[1.125rem] flex items-center justify-between gap-3">
        <Segmented
          size="xs"
          label="Calendar view"
          value={view}
          onValueChange={onViewChange}
          className="w-[10.5rem]"
          options={[
            { value: "weeks", label: "Weeks" },
            { value: "month", label: "Month" },
          ]}
        />
        <Button
          size="sm"
          variant={editing ? "habit" : "outline"}
          aria-pressed={editing}
          onClick={() => setEditing(!editing)}
          className="hover-fine:not-active:translate-y-0"
        >
          {editing ? "Done" : "Edit days"}
        </Button>
      </div>
      {editing && (
        <p className="-mt-1.5 mb-4 text-[0.8125rem] text-muted-foreground">
          {habit.kind === "build"
            ? "Tap a day to check in or undo it."
            : "Tap a day to log a slip on it, or tap again to remove it."}
        </p>
      )}

      {view === "weeks" ? (
        <WeeksGrid
          firstDay={firstDay}
          weekStart={weekStart}
          minWeeks={minWeeks}
          info={info}
          cell={cell}
        />
      ) : (
        <MonthGrid firstDay={firstDay} weekStart={weekStart} info={info} cell={cell} />
      )}

      <ul className="mt-[1.125rem] flex flex-wrap gap-x-[1.125rem] gap-y-2 text-[0.8125rem] text-muted-foreground">
        <li className="flex items-center gap-2">
          <i className="h-2.5 w-4 rounded-full bg-habit" />
          {habit.kind === "quit" ? "Clean day" : "Check-in"}
        </li>
        {habit.kind === "quit" ? (
          <li className="flex items-center gap-2">
            <i className="mx-1.5 size-[0.3125rem] rounded-full bg-habit" />
            Slip
          </li>
        ) : (
          <li className="flex items-center gap-2">
            <i className="mx-0.5 size-3 rounded-full shadow-[inset_0_0_0_1.5px_var(--habit)]" />
            Not checked in yet
          </li>
        )}
      </ul>
    </div>
  );
}

type CellCtx = {
  editing: boolean;
  kind: Habit["kind"];
  onToggleDay: (iso: string) => void;
};

/** A day: plain at rest, a button while editing. */
function Day({
  d,
  ctx,
  className,
  children,
}: {
  d: DayInfo;
  ctx: CellCtx;
  className: string;
  children: React.ReactNode;
}) {
  if (!ctx.editing || !d.editable) {
    return (
      <span
        className={cn(className, ctx.editing && "opacity-35")}
        aria-disabled={ctx.editing || undefined}
      >
        {children}
      </span>
    );
  }
  const on = ctx.kind === "build" ? d.inStreak : d.slip;
  const state =
    ctx.kind === "build" ? (on ? "checked in" : "not checked in") : on ? "slip" : "clean";
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${fmtShort(d.date)}: ${state}`}
      onClick={() => ctx.onToggleDay(toISO(d.date))}
      className={cn(className, "cursor-pointer focus-ring-flush")}
    >
      {children}
    </button>
  );
}

const slipDot =
  "after:absolute after:left-1/2 after:size-[0.3125rem] after:-translate-x-1/2 after:rounded-full after:bg-habit";

function WeeksGrid({
  firstDay,
  weekStart,
  minWeeks,
  info,
  cell,
}: {
  firstDay: Date;
  weekStart: WeekStart;
  minWeeks: number;
  info: (d: Date) => DayInfo;
  cell: CellCtx;
}) {
  const t = today();
  const last = startOfWeek(t, weekStart);
  const from = new Date(Math.min(firstDay.getTime(), addDays(last, -7 * (minWeeks - 1)).getTime()));
  const earliest = addDays(last, -7 * 52);
  const cols: Date[] = [];
  for (
    let c = startOfWeek(from < earliest ? earliest : from, weekStart);
    c <= last;
    c = addDays(c, 7)
  ) {
    cols.push(c);
  }
  const labelOf = (i: number) => {
    const c = cols[i];
    const changed = i > 0 && c.getMonth() !== cols[i - 1].getMonth();
    const nextChanges = i + 1 < cols.length && cols[i + 1].getMonth() !== c.getMonth();
    if (!(changed || (i === 0 && !nextChanges))) return null;
    const m = monthShort.format(c);
    return i === 0 || c.getMonth() === 0 ? `${m} ${c.getFullYear()}` : m;
  };

  const scroller = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const rows = "grid grid-rows-[1.125rem_repeat(7,1.75rem)] gap-1";
  return (
    <div className="-mr-1 flex gap-2">
      <div
        ref={scroller}
        className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [mask-image:linear-gradient(to_right,transparent,#000_1.25rem)] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max gap-1 pl-4">
          {cols.map((c, i) => (
            <div key={toISO(c)} className={cn(rows, "w-7")}>
              <span className="self-end font-mono text-[0.625rem] whitespace-nowrap text-muted-foreground">
                {labelOf(i)}
              </span>
              {Array.from({ length: 7 }, (_, j) => {
                const date = addDays(c, j);
                if (date > t) return <span key={j} />;
                const d = info(date);
                return (
                  <Day
                    key={j}
                    d={d}
                    ctx={cell}
                    className={cn(
                      "relative grid size-7 place-items-center rounded-lg text-[0.6875rem] tabular-nums transition-[background-color,box-shadow,transform,translate,scale] duration-120",
                      d.inStreak
                        ? "bg-habit text-habit-foreground"
                        : "bg-muted text-muted-foreground",
                      d.isToday && "font-semibold shadow-[inset_0_0_0_1.5px_var(--habit)]",
                      d.isToday &&
                        d.inStreak &&
                        "shadow-[inset_0_0_0_2px_var(--habit),inset_0_0_0_0.21875rem_var(--habit-foreground)]",
                      d.slip && cn(slipDot, "after:bottom-0.5"),
                      cell.editing &&
                        d.editable &&
                        "active:scale-90 hover-fine:shadow-[inset_0_0_0_1.5px_var(--foreground)]",
                    )}
                  >
                    {date.getDate()}
                  </Day>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden="true" className={cn(rows, "flex-none")}>
        <span />
        {rotate(NAMES, weekStart).map((n) => (
          <span
            key={n}
            className="flex items-center font-mono text-[0.625rem] text-muted-foreground"
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

function MonthGrid({
  firstDay,
  weekStart,
  info,
  cell,
}: {
  firstDay: Date;
  weekStart: WeekStart;
  info: (d: Date) => DayInfo;
  cell: CellCtx;
}) {
  const t = today();
  const [month, setMonth] = useState(() => new Date(t.getFullYear(), t.getMonth(), 1));
  const key = (d: Date) => d.getFullYear() * 12 + d.getMonth();
  const lead = (month.getDay() - weekStart + 7) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, i) => addDays(month, i)),
  ];
  const go = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <div className="max-w-[28.75rem]">
      <div className="-mt-2 mb-1.5 -mr-2.5 flex items-center justify-between">
        <p className="text-lg font-medium tracking-[-0.01em]">{monthFmt.format(month)}</p>
        <div className="flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            disabled={key(month) <= key(firstDay)}
            onClick={() => go(-1)}
          >
            <ChevronLeft strokeWidth={1.75} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next month"
            disabled={key(month) >= key(t)}
            onClick={() => go(1)}
          >
            <ChevronRight strokeWidth={1.75} />
          </Button>
        </div>
      </div>
      <div aria-hidden="true" className="grid grid-cols-7">
        {rotate(LETTERS, weekStart).map((n, i) => (
          <span key={i} className="py-1.5 text-center font-mono text-xs text-muted-foreground">
            {n}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((date, i) => {
          if (!date) return <span key={`b${i}`} />;
          if (date > t) {
            return (
              <span
                key={toISO(date)}
                className="grid h-[2.625rem] place-items-center text-[0.9375rem] text-muted-foreground opacity-45"
              >
                {date.getDate()}
              </span>
            );
          }
          const d = info(date);
          const col = i % 7;
          const prev = col > 0 && date.getDate() > 1 && info(addDays(date, -1)).inStreak;
          const next = col < 6 && date.getDate() < count && info(addDays(date, 1)).inStreak;
          return (
            <Day
              key={toISO(date)}
              d={d}
              ctx={cell}
              className={cn(
                "relative grid h-[2.625rem] place-items-center text-[0.9375rem] tabular-nums",
                cell.editing &&
                  d.editable &&
                  "active:[&>span]:scale-90 hover-fine:[&>span]:shadow-[inset_0_0_0_1.5px_var(--foreground)]",
                d.inStreak &&
                  "text-habit-foreground before:absolute before:inset-x-0 before:inset-y-1 before:bg-habit",
                d.inStreak && !prev && "before:left-1 before:rounded-l-full",
                d.inStreak && !next && "before:right-1 before:rounded-r-full",
                d.slip && cn(slipDot, "after:bottom-0"),
              )}
            >
              <span
                className={cn(
                  "relative z-10 grid size-[2.125rem] place-items-center rounded-full transition-[box-shadow,transform,translate,scale] duration-120",
                  d.isToday && "font-semibold shadow-[inset_0_0_0_1.5px_var(--habit)]",
                  d.isToday && d.inStreak && "bg-habit-foreground text-habit shadow-none",
                )}
              >
                {date.getDate()}
              </span>
            </Day>
          );
        })}
      </div>
    </div>
  );
}
