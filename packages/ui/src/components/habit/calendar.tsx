import { useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  archivedDays,
  canToggle,
  fmtShort,
  fromISO,
  historyStart,
  daysByStreak,
  loggedDays,
  today,
  toISO,
  type Habit,
  type Kind,
  type WeekStart,
} from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import { Segmented } from "@streakky/ui/components/segmented";
import { KIND_COPY } from "@streakky/ui/lib/kind-copy";
import { cn } from "@streakky/ui/lib/utils";

export type CalendarView = "weeks" | "month";

const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const monthShort = new Intl.DateTimeFormat("en-GB", { month: "short" });
const LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * How far back Month pages for a build habit: a year before its first check-in, or before today
 * with none, so a missed day can be backfilled further back than the history goes, and a new
 * habit's Month reaches last month.
 */
const BACKFILL_MONTHS = 12;

const rotate = <T,>(list: T[], weekStart: WeekStart) =>
  weekStart === 1 ? [...list.slice(1), list[0]] : list;
const startOfWeek = (d: Date, weekStart: WeekStart) =>
  addDays(d, -((d.getDay() - weekStart + 7) % 7));
const monthOf = (d: Date, months = 0) => new Date(d.getFullYear(), d.getMonth() + months, 1);

type DayInfo = {
  date: Date;
  inStreak: boolean;
  slip: boolean;
  /** a quit habit's archived day: neither clean nor a slip */
  archived: boolean;
  /** a check-in (build) or a slip (quit) */
  logged: boolean;
  isToday: boolean;
  editable: boolean;
  /** what the day was, for screen readers: "checked in", "slip", "archived day" */
  state: string;
};

/** Edit days, as the days see it: whether it's on, and what a tap on a day does. */
type DayEditing = {
  editing: boolean;
  onToggleDay?: (iso: string) => void;
};

/**
 * A habit's days. Every check-in or clean day takes the habit colour in full; a slip is an
 * unfilled day with a dot; a quit habit's archived day is hatched; today, not checked in yet, is a
 * ring. Weeks: columns are weeks, newest on the right, opening on today. Month: a classic grid
 * with streaks drawn as bands, and archived days as hatched discs apart from them. Each day tells
 * a screen reader its date and what it was. "Edit days" turns the days that can change into
 * 2.75rem buttons that call onToggleDay; without onToggleDay there's no "Edit days".
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
  /** left out when the days can't be changed */
  onToggleDay?: (iso: string) => void;
  /** weeks the Weeks view shows at least, before its history began if need be */
  minWeeks?: number;
  className?: string;
}) {
  const [editingOn, setEditing] = useState(false);
  const editing = editingOn && onToggleDay !== undefined;
  const copy = KIND_COPY[habit.kind];
  // not memoised on the habit: a quit habit's clean days grow at midnight while the habit stays the same
  const streakDays = daysByStreak(habit);
  const todayISO = toISO(today());
  // only the logged days that count: a slip on or before the quit day draws no dot
  const slips = new Set(habit.kind === "quit" ? loggedDays(habit) : []);
  // a build habit has none: its archived days are days without check-ins
  const archived = new Set(archivedDays(habit));
  const firstDay = fromISO(historyStart(habit));
  // a quit habit's days can only change after its quit day; a build habit's on any past day
  const earliestMonth =
    habit.kind === "quit" ? monthOf(firstDay) : monthOf(firstDay, -BACKFILL_MONTHS);

  const stateOf = (iso: string, inStreak: boolean, slip: boolean, isArchived: boolean) => {
    if (habit.kind === "build") {
      if (inStreak) return copy.dayLogged;
      return iso === todayISO ? `${copy.dayNotLogged} yet` : copy.dayNotLogged;
    }
    if (slip) return copy.dayLogged;
    if (isArchived) return "archived day";
    if (inStreak) return copy.dayNotLogged;
    return iso === habit.quitDay ? "quit day" : "before the quit day";
  };
  const info = (date: Date): DayInfo => {
    const iso = toISO(date);
    const inStreak = streakDays.has(iso);
    const slip = slips.has(iso);
    const isArchived = archived.has(iso);
    return {
      date,
      inStreak,
      slip,
      archived: isArchived,
      logged: habit.kind === "build" ? inStreak : slip,
      isToday: iso === todayISO,
      editable: canToggle(habit, iso),
      state: stateOf(iso, inStreak, slip, isArchived),
    };
  };
  const edit: DayEditing = { editing, onToggleDay };

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
        {onToggleDay && (
          <Button
            size="sm"
            variant={editing ? "habit" : "outline"}
            aria-pressed={editing}
            onClick={() => setEditing(!editing)}
            className="hover-fine:not-active:translate-y-0"
          >
            {editing ? "Done" : "Edit days"}
          </Button>
        )}
      </div>
      {editing && (
        <p className="-mt-1.5 mb-4 text-[0.8125rem] text-muted-foreground">{copy.editHint}</p>
      )}

      {view === "weeks" ? (
        <WeeksGrid
          firstDay={firstDay}
          weekStart={weekStart}
          minWeeks={minWeeks}
          info={info}
          edit={edit}
        />
      ) : (
        <MonthGrid earliest={earliestMonth} weekStart={weekStart} info={info} edit={edit} />
      )}

      <Legend kind={habit.kind} archived={archived.size > 0} />
    </div>
  );
}

/** What the colours and marks mean. */
function Legend({ kind, archived }: { kind: Kind; archived: boolean }) {
  return (
    <ul className="mt-[1.125rem] flex flex-wrap gap-x-[1.125rem] gap-y-2 text-[0.8125rem] text-muted-foreground">
      <li className="flex items-center gap-2">
        <i className="h-2.5 w-4 rounded-full bg-habit" />
        {KIND_COPY[kind].streakDay}
      </li>
      {kind === "quit" ? (
        <>
          <li className="flex items-center gap-2">
            <i className="mx-1.5 size-[0.3125rem] rounded-full bg-habit" />
            Slip
          </li>
          {archived && (
            <li className="flex items-center gap-2">
              <i className="h-2.5 w-4 rounded-full bg-archived" />
              Archived day
            </li>
          )}
        </>
      ) : (
        <li className="flex items-center gap-2">
          <i className="mx-0.5 size-3 rounded-full shadow-[inset_0_0_0_1.5px_var(--habit)]" />
          Not checked in yet
        </li>
      )}
    </ul>
  );
}

/**
 * A day: its number at rest, with its date and what it was for screen readers; while editing, a
 * button if it can change, and dimmed if it can't.
 */
function Day({
  day,
  edit,
  className,
  children,
}: {
  day: DayInfo;
  edit: DayEditing;
  className: string;
  children: React.ReactNode;
}) {
  const said = `${fmtShort(day.date)}: ${day.state}`;
  if (!edit.editing || !day.editable) {
    return (
      <span className={cn(className, edit.editing && "opacity-35")}>
        <span aria-hidden="true" className="contents">
          {children}
        </span>
        <span className="sr-only">{said}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={day.logged}
      aria-label={said}
      onClick={() => edit.onToggleDay?.(toISO(day.date))}
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
  edit,
}: {
  firstDay: Date;
  weekStart: WeekStart;
  minWeeks: number;
  info: (d: Date) => DayInfo;
  edit: DayEditing;
}) {
  const t = today();
  const last = startOfWeek(t, weekStart);
  const from = new Date(Math.min(firstDay.getTime(), addDays(last, -7 * (minWeeks - 1)).getTime()));
  // older days are in Month, which pages further back
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

  // Opens on today. While editing, the days grow to 2.75rem, and the week at the right edge stays
  // there, so today's stays in view, or the one scrolled back to.
  const scroller = useRef<HTMLDivElement>(null);
  const scrollWidth = useRef(0);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (scrollWidth.current === 0) el.scrollLeft = el.scrollWidth;
    else {
      const rightEdge = (el.scrollLeft + el.clientWidth) / scrollWidth.current;
      el.scrollLeft = rightEdge * el.scrollWidth - el.clientWidth;
    }
    scrollWidth.current = el.scrollWidth;
  }, [edit.editing]);

  const rows = cn(
    "grid gap-1",
    edit.editing
      ? "grid-rows-[1.125rem_repeat(7,2.75rem)]"
      : "grid-rows-[1.125rem_repeat(7,1.75rem)]",
  );
  return (
    <div className="-mr-1 flex gap-2">
      <div
        ref={scroller}
        // At rest the days aren't controls, so the weeks themselves take focus, for the arrow
        // keys to scroll back through them; while editing, the day buttons do.
        role="group"
        aria-label="Weeks, newest last"
        tabIndex={edit.editing ? undefined : 0}
        className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain rounded-lg py-0.5 pr-0.5 [scrollbar-width:none] [mask-image:linear-gradient(to_right,transparent,#000_1.25rem)] focus-ring-flush focus-visible:-outline-offset-2 [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max gap-1 pl-4">
          {cols.map((c, i) => (
            <div key={toISO(c)} className={cn(rows, edit.editing ? "w-11" : "w-7")}>
              <span
                aria-hidden="true"
                className="self-end font-mono text-[0.625rem] whitespace-nowrap text-muted-foreground"
              >
                {labelOf(i)}
              </span>
              {Array.from({ length: 7 }, (_, j) => {
                const date = addDays(c, j);
                if (date > t) return <span key={j} />;
                const day = info(date);
                return (
                  <Day
                    key={j}
                    day={day}
                    edit={edit}
                    className={cn(
                      "relative grid place-items-center tabular-nums transition-[background-color,box-shadow,transform,translate,scale] duration-120",
                      edit.editing
                        ? "size-11 rounded-xl text-[0.8125rem]"
                        : "size-7 rounded-lg text-[0.6875rem]",
                      day.inStreak
                        ? "bg-habit text-habit-foreground"
                        : day.archived
                          ? "bg-archived text-muted-foreground"
                          : "bg-muted text-muted-foreground",
                      day.isToday && "font-semibold shadow-[inset_0_0_0_1.5px_var(--habit)]",
                      day.isToday &&
                        day.inStreak &&
                        "shadow-[inset_0_0_0_2px_var(--habit),inset_0_0_0_0.21875rem_var(--habit-foreground)]",
                      day.slip && cn(slipDot, edit.editing ? "after:bottom-1" : "after:bottom-0.5"),
                      edit.editing &&
                        day.editable &&
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
      <div aria-hidden="true" className={cn(rows, "flex-none py-0.5")}>
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

/** One month at a time, from `earliest` to this month; each row's days are 2.75rem tall. */
function MonthGrid({
  earliest,
  weekStart,
  info,
  edit,
}: {
  earliest: Date;
  weekStart: WeekStart;
  info: (d: Date) => DayInfo;
  edit: DayEditing;
}) {
  const t = today();
  const [month, setMonth] = useState(() => monthOf(t));
  const key = (d: Date) => d.getFullYear() * 12 + d.getMonth();
  const lead = (month.getDay() - weekStart + 7) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, i) => addDays(month, i)),
  ];
  const go = (n: number) => setMonth(monthOf(month, n));

  return (
    <div className="max-w-[28.75rem]">
      <div className="-mt-2 mb-1.5 -mr-2.5 flex items-center justify-between">
        <p className="text-lg font-medium tracking-[-0.01em]">{monthFmt.format(month)}</p>
        <div className="flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            disabled={key(month) <= key(earliest)}
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
            // days to come say nothing to a screen reader
            return (
              <span
                key={toISO(date)}
                aria-hidden="true"
                className="grid h-11 place-items-center text-[0.9375rem] text-muted-foreground opacity-45"
              >
                {date.getDate()}
              </span>
            );
          }
          const day = info(date);
          const col = i % 7;
          const prev = col > 0 && date.getDate() > 1 && info(addDays(date, -1)).inStreak;
          const next = col < 6 && date.getDate() < count && info(addDays(date, 1)).inStreak;
          return (
            <Day
              key={toISO(date)}
              day={day}
              edit={edit}
              className={cn(
                "relative grid h-11 place-items-center text-[0.9375rem] tabular-nums",
                edit.editing &&
                  day.editable &&
                  "active:[&_[data-disc]]:scale-90 hover-fine:[&_[data-disc]]:shadow-[inset_0_0_0_1.5px_var(--foreground)]",
                day.inStreak &&
                  "text-habit-foreground before:absolute before:inset-x-0 before:inset-y-[0.3125rem] before:bg-habit",
                day.inStreak && !prev && "before:left-1 before:rounded-l-full",
                day.inStreak && !next && "before:right-1 before:rounded-r-full",
                day.archived && "text-muted-foreground",
                day.slip && cn(slipDot, "after:bottom-0"),
              )}
            >
              <span
                data-disc
                className={cn(
                  "relative z-10 grid size-[2.125rem] place-items-center rounded-full transition-[box-shadow,transform,translate,scale] duration-120",
                  // a day apart, not a band: an archived day isn't one of the streak's days
                  day.archived && "bg-archived",
                  day.isToday && "font-semibold shadow-[inset_0_0_0_1.5px_var(--habit)]",
                  day.isToday && day.inStreak && "bg-habit-foreground text-habit shadow-none",
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
