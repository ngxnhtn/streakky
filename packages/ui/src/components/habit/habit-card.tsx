import * as React from "react";
import { Check, Plus, RotateCcw } from "lucide-react";
import type { ColorId, Kind, Layout } from "@streakky/core";
import { useReorder, type ReorderState } from "@streakky/ui/hooks/use-reorder";
import { cn } from "@streakky/ui/lib/utils";

/** Today's state on a build habit: an empty ring, filled with a tick once checked in. */
export function CheckInTick({ checkedIn, className }: { checkedIn: boolean; className?: string }) {
  return (
    <span
      data-slot="check-in-tick"
      className={cn(
        "grid size-[1.375rem] flex-none place-items-center rounded-full text-habit-foreground",
        "transition-[background-color,box-shadow] duration-200 ease-ui",
        checkedIn ? "bg-habit" : "shadow-[inset_0_0_0_1.5px_var(--habit)]",
        className,
      )}
    >
      {checkedIn && <Check strokeWidth={2.5} className="size-[60%]" />}
    </span>
  );
}

/** Today's state on a quit habit: a ring around a turn-back arrow, filled once a slip is logged. */
export function SlipIcon({ slipped, className }: { slipped: boolean; className?: string }) {
  return (
    <span
      data-slot="slip-icon"
      className={cn(
        "grid size-[1.375rem] flex-none place-items-center rounded-full",
        "transition-[background-color,box-shadow,color] duration-200 ease-ui",
        slipped
          ? "bg-habit text-habit-foreground"
          : "text-habit shadow-[inset_0_0_0_1.5px_var(--habit)]",
        className,
      )}
    >
      <RotateCcw strokeWidth={2.5} className="size-[55%]" />
    </span>
  );
}

/** Today on a habit's face. */
export type Today = {
  /** build: checked in today; quit: a slip logged today */
  logged: boolean;
  /** today can't be logged, as on a quit habit's quit day */
  locked?: boolean;
  /**
   * With it, today's tick (build) or slip (quit) is a button of its own. A slip ends the current
   * streak, so ask before logging one.
   */
  onToggle?: () => void;
};

/**
 * Today's tick or slip as a toggle, in a 2.75rem target: checks a build habit in today or undoes
 * it, or logs a quit habit's slip today or removes it. Its name stays the same either way, and
 * `aria-pressed` says which.
 */
export function TodayToggle({
  kind,
  name,
  today: { logged, locked, onToggle },
  className,
  markClassName,
}: {
  kind: Kind;
  name: string;
  today: Today;
  className?: string;
  /** sizes the tick or slip inside the 2.75rem target */
  markClassName?: string;
}) {
  return (
    <button
      type="button"
      data-slot={kind === "build" ? "check-in-button" : "slip-button"}
      aria-label={kind === "build" ? `Check in ${name} today` : `Log a slip for ${name} today`}
      aria-pressed={logged}
      disabled={locked}
      onClick={onToggle}
      className={cn(
        "grid size-11 place-items-center rounded-full",
        "transition-[background-color,transform,scale,opacity] duration-120 ease-ui",
        "hover-fine:bg-habit/12 active:scale-94 active:duration-90",
        "focus-ring-flush",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
    >
      {kind === "build" ? (
        <CheckInTick checkedIn={logged} className={markClassName} />
      ) : (
        <SlipIcon slipped={logged} className={markClassName} />
      )}
    </button>
  );
}

const tileGround = [
  "w-full border border-transparent text-left",
  "bg-habit/9 dark:bg-habit/16",
  "transition-[transform,border-color,box-shadow,background-color,translate,scale] duration-120 ease-ui",
].join(" ");
const tileLift =
  "hover-fine:-translate-y-0.5 hover-fine:border-input hover-fine:shadow-[0_0.75rem_1.5rem_-0.875rem_rgb(0_0_0/0.28)] hover-fine:duration-180";
const tile = [tileGround, tileLift, "focus-ring active:scale-[0.98] active:duration-90"].join(" ");

/** What both faces take: `HabitCard` in the grid, `HabitRow` in the list. */
export type HabitFaceProps = {
  name: string;
  days: number;
  /** what the count counts: "day streak", "days free" */
  unit: string;
  /** how today stands: "Checked in today", "Since 12 Nov", "Check in today to start" */
  status: string;
  kind: Kind;
  color: ColorId;
  today: Today;
  /** opens the habit, from anywhere on the face but today's button */
  onClick?: () => void;
  className?: string;
};

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** What a screen reader hears for a face: "Morning run: 6 day streak, checked in today". */
const summaryOf = ({ name, days, unit, status }: HabitFaceProps) =>
  `${name}: ${days} ${unit}, ${lowerFirst(status)}`;

/**
 * The tile both faces sit on. With `onClick` and no button of today's inside, the whole face is
 * the button that opens the habit. With today's button too, an open button covers the face under
 * it, and the face's own text is hidden from screen readers, since the open button names it.
 */
function FaceShell({
  slot,
  face,
  whole,
  shape,
  children,
}: {
  slot: "habit-card" | "habit-row";
  face: HabitFaceProps;
  /** the whole face is the open button */
  whole: boolean;
  shape: string;
  children: React.ReactNode;
}) {
  const { color, onClick, className } = face;
  if (whole) {
    return (
      <button
        type="button"
        data-slot={slot}
        data-habit-color={color}
        onClick={onClick}
        aria-label={summaryOf(face)}
        className={cn(tile, shape, className)}
      >
        {children}
      </button>
    );
  }
  return (
    <div
      data-slot={slot}
      data-habit-color={color}
      className={cn(
        tileGround,
        "relative",
        onClick && [tileLift, "has-[>[data-slot=habit-open]:active]:scale-[0.98]"],
        shape,
        className,
      )}
    >
      {onClick && (
        <button
          type="button"
          data-slot="habit-open"
          onClick={onClick}
          aria-label={summaryOf(face)}
          className="focus-ring absolute inset-0 rounded-[inherit]"
        />
      )}
      {children}
    </div>
  );
}

/**
 * Grid face: the name on top, the big count in the habit's colour at the bottom, and what it
 * counts under it, or with no streak yet, how today stands. With `today.onToggle`, today's tick or
 * slip is a button in the corner; `onClick` then opens the habit from anywhere else on the card.
 * Without `onClick` the card opens nothing.
 */
export function HabitCard(face: HabitFaceProps) {
  const { name, days, unit, status, kind, today, onClick } = face;
  const toggles = today.onToggle !== undefined;
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-sm leading-tight font-medium">{name}</span>
        {toggles ? (
          <span className="size-[1.375rem] flex-none" />
        ) : (
          kind === "build" && <CheckInTick checkedIn={today.logged} className="-mt-px -mr-0.5" />
        )}
      </span>
      <span className="mt-auto font-display text-[3.25rem] leading-[0.9] font-medium tracking-[-0.045em] text-habit tabular-nums [font-stretch:96%]">
        {days}
      </span>
      <span className="mt-1.5 text-[0.8125rem] text-muted-foreground">
        {days === 0 ? lowerFirst(status) : unit}
      </span>
    </>
  );
  const shape = "flex h-[10.5rem] flex-col rounded-3xl p-4";
  const whole = !toggles && onClick !== undefined;
  return (
    <FaceShell slot="habit-card" face={face} whole={whole} shape={shape}>
      {whole ? (
        body
      ) : (
        <>
          <span
            aria-hidden={onClick ? true : undefined}
            className="pointer-events-none relative flex flex-1 flex-col"
          >
            {body}
          </span>
          {toggles && (
            <TodayToggle
              kind={kind}
              name={name}
              today={today}
              className="absolute top-1 right-[0.1875rem]"
            />
          )}
        </>
      )}
    </FaceShell>
  );
}

/**
 * List face: the name and how today stands on the left, the count on the right. With
 * `today.onToggle`, today's tick or slip in the status line is a button, as on `HabitCard`.
 */
export function HabitRow(face: HabitFaceProps) {
  const { name, days, unit, status, kind, today, onClick } = face;
  const toggles = today.onToggle !== undefined;
  // today's button sits in the text, so with the open button over the row, the text is hidden
  // from screen readers span by span
  const hideText = toggles && onClick ? true : undefined;
  const body = (
    <>
      <span className="flex min-w-0 flex-col gap-1">
        <span aria-hidden={hideText} className="truncate text-base font-medium">
          {name}
        </span>
        <span className="flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
          {toggles ? (
            // the 2.75rem target overhangs the 1rem mark, so the line keeps its height
            <TodayToggle
              kind={kind}
              name={name}
              today={today}
              markClassName="size-4"
              className="pointer-events-auto -m-3.5"
            />
          ) : (
            kind === "build" && <CheckInTick checkedIn={today.logged} className="size-4" />
          )}
          <span aria-hidden={hideText}>{status}</span>
        </span>
      </span>
      <span aria-hidden={hideText} className="flex flex-none flex-col items-end gap-0.5">
        <span className="font-display text-[2.125rem] leading-[0.95] font-medium tracking-[-0.04em] text-habit tabular-nums [font-stretch:96%]">
          {days}
        </span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </span>
    </>
  );
  const shape =
    "flex min-h-[4.75rem] items-center justify-between gap-4 rounded-[1.25rem] px-[1.125rem] py-3";
  const whole = !toggles && onClick !== undefined;
  return (
    <FaceShell slot="habit-row" face={face} whole={whole} shape={shape}>
      {whole ? (
        body
      ) : (
        <span className="pointer-events-none relative flex min-w-0 flex-1 items-center justify-between gap-4">
          {body}
        </span>
      )}
    </FaceShell>
  );
}

/** The dashed "New habit" tile at the end of the grid or list. */
export function NewHabitTile({
  layout,
  onClick,
  className,
}: {
  layout: Layout;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-slot="new-habit"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-center gap-2 border-[1.5px] border-dashed border-input text-sm font-medium text-muted-foreground",
        "transition-[border-color,color,transform,translate,scale] duration-120 ease-ui focus-ring-flush",
        "hover-fine:border-foreground hover-fine:text-foreground active:scale-[0.98]",
        layout === "grid"
          ? "h-[10.5rem] flex-col rounded-3xl"
          : "min-h-[3.75rem] rounded-[1.25rem]",
        "[&_svg]:size-5 [&_svg]:stroke-[1.75]",
        className,
      )}
    >
      <Plus />
      <span>New habit</span>
    </button>
  );
}

/** How a habit face looks at each step of a drag (see `useReorder`). */
const reorderLook: Record<ReorderState, string> = {
  // Picked up: raised over the others on a soft shadow, the face edged with a hairline so it
  // shows on dark too. The face's own press and hover moves stop, so it stays flush with its
  // shadow while the pointer still holds it.
  lifted: [
    "z-10 cursor-grabbing [&_*]:cursor-grabbing",
    "shadow-[0_1.25rem_2.5rem_-1rem_rgb(0_0_0/0.38)] motion-safe:scale-[1.03]",
    "*:border-input! *:translate-y-0! *:scale-100!",
    "transition-[scale,box-shadow] duration-180 ease-ui",
  ].join(" "),
  settling: "z-10 transition-[translate,scale,box-shadow] duration-200 ease-ui",
  shifting: "transition-[translate] duration-200 ease-ui",
  moved: "",
};

/**
 * Lays out habit faces as a grid of cards (two across on a phone) or a list of rows.
 * With `onMove`, the person can drag the faces into their own order: a mouse drags at once, a
 * finger after resting on a face for a moment, so a swipe still scrolls. Alt with the up or down
 * arrow moves the face holding the focus. `onMove(from, to)` gets the moved face's index before
 * and after. `end`, such as the New habit tile, comes after the faces and never moves.
 */
export function HabitCollection({
  layout,
  className,
  children,
  onMove,
  end,
}: {
  layout: Layout;
  className?: string;
  children: React.ReactNode;
  onMove?: (from: number, to: number) => void;
  end?: React.ReactNode;
}) {
  const faces = React.Children.toArray(children).filter(React.isValidElement);
  const { listRef, item, announcement } = useReorder({
    keys: faces.map((face) => String(face.key)),
    onMove: onMove ?? (() => {}),
    enabled: onMove !== undefined,
  });
  return (
    <>
      <ul
        key={layout}
        ref={listRef}
        aria-label="Your habits"
        data-slot="habit-collection"
        data-layout={layout}
        className={cn(
          "grid animate-rise",
          layout === "grid"
            ? "grid-cols-[repeat(auto-fill,minmax(9.375rem,1fr))] gap-2.5"
            : "grid-cols-[repeat(auto-fill,minmax(min(100%,22.5rem),1fr))] gap-2",
          className,
        )}
      >
        {faces.map((face, i) => {
          const { "data-reorder": state, ...props } = item(i);
          return (
            <li
              key={face.key}
              data-reorder={state}
              {...props}
              className={cn(
                onMove && [
                  // a resting finger lifts the face, so it mustn't pick text or call up a menu
                  "select-none [-webkit-touch-callout:none]",
                  layout === "grid" ? "rounded-3xl" : "rounded-[1.25rem]",
                ],
                state && reorderLook[state],
              )}
            >
              {face}
            </li>
          );
        })}
        {end && <li>{end}</li>}
      </ul>
      {onMove && (
        <p role="status" className="sr-only">
          {announcement}
        </p>
      )}
    </>
  );
}
