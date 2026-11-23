import * as React from "react";
import { Check, Plus } from "lucide-react";
import type { ColorId, Kind } from "@streakky/core";
import { cn } from "@streakky/ui/lib/utils";

/** Today's state on a build habit: an empty ring, filled with a tick once checked in. */
export function CheckInTick({ checkedIn, className }: { checkedIn: boolean; className?: string }) {
  return (
    <span
      data-slot="check-in-tick"
      className={cn(
        "grid size-[22px] flex-none place-items-center rounded-full text-habit-foreground",
        "transition-[background-color,box-shadow] duration-200 ease-ui",
        checkedIn ? "bg-habit" : "shadow-[inset_0_0_0_1.5px_var(--habit)]",
        className,
      )}
    >
      {checkedIn && <Check strokeWidth={2.5} className="size-[60%]" />}
    </span>
  );
}

/** The tick as a toggle: checks a build habit in today, or undoes it. A 44px target around it. */
export function CheckInButton({
  name,
  checkedIn,
  onToggle,
  className,
}: {
  name: string;
  checkedIn: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-slot="check-in-button"
      aria-label={`Check in ${name} today`}
      aria-pressed={checkedIn}
      onClick={onToggle}
      className={cn(
        "grid size-11 place-items-center rounded-full outline-none",
        "transition-[background-color,transform,scale] duration-120 ease-ui",
        "hover-fine:bg-habit/12 active:scale-94 active:duration-90",
        "focus-visible:outline-2 focus-visible:outline-ring",
        className,
      )}
    >
      <CheckInTick checkedIn={checkedIn} />
    </button>
  );
}

const tileGround = [
  "w-full border border-transparent text-left outline-none",
  "bg-habit/9 dark:bg-habit/16",
  "transition-[transform,border-color,box-shadow,background-color,translate,scale] duration-120 ease-ui",
].join(" ");
const tileLift =
  "hover-fine:-translate-y-0.5 hover-fine:border-input hover-fine:shadow-[0_12px_24px_-14px_rgb(0_0_0/0.28)] hover-fine:duration-180";
const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const tile = [tileGround, tileLift, focusRing, "active:scale-[0.98] active:duration-90"].join(" ");

type HabitFace = {
  name: string;
  days: number;
  /** under the count: "day streak", "days free" */
  label: string;
  kind: Kind;
  color: ColorId;
  /** build habits: checked in today */
  checkedIn: boolean;
  onClick: () => void;
  className?: string;
};

const summaryOf = ({
  name,
  days,
  label,
  kind,
  checkedIn,
}: Pick<HabitFace, "name" | "days" | "label" | "kind" | "checkedIn">) =>
  `${name}: ${days} ${label}${kind === "build" ? (checkedIn ? ", checked in today" : ", not checked in today") : ""}`;

/**
 * Grid face: the name on top, the big count in the habit's colour at the bottom.
 * With `onCheckIn`, a build habit's tick becomes its own button; `onClick` then opens the habit
 * from anywhere else on the card, and without it the card is not a button at all.
 */
export function HabitCard({
  onCheckIn,
  ...face
}: Omit<HabitFace, "onClick"> & { onClick?: () => void; onCheckIn?: () => void }) {
  const { name, days, label, kind, color, checkedIn, onClick, className } = face;
  const summary = summaryOf(face);
  const tickIsButton = kind === "build" && onCheckIn !== undefined;
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-sm leading-tight font-medium">{name}</span>
        {kind === "build" &&
          (tickIsButton ? (
            <span className="size-[22px] flex-none" />
          ) : (
            <CheckInTick checkedIn={checkedIn} className="-mt-px -mr-0.5" />
          ))}
      </span>
      <span className="mt-auto font-display text-[52px] leading-[0.9] font-medium tracking-[-0.045em] text-habit tabular-nums [font-stretch:96%]">
        {days}
      </span>
      <span className="mt-1.5 text-[13px] text-muted-foreground">{label}</span>
    </>
  );
  const shape = "flex h-[168px] flex-col rounded-3xl p-4";

  if (!tickIsButton && onClick) {
    return (
      <button
        type="button"
        data-slot="habit-card"
        data-habit-color={color}
        onClick={onClick}
        aria-label={summary}
        className={cn(tile, shape, className)}
      >
        {body}
      </button>
    );
  }
  return (
    <div
      data-slot="habit-card"
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
          aria-label={summary}
          className={cn("absolute inset-0 rounded-[inherit]", focusRing)}
        />
      )}
      <span
        aria-hidden={onClick ? true : undefined}
        className="pointer-events-none relative flex flex-1 flex-col"
      >
        {body}
      </span>
      {tickIsButton && (
        <CheckInButton
          name={name}
          checkedIn={checkedIn}
          onToggle={onCheckIn}
          className="absolute top-1 right-[3px]"
        />
      )}
    </div>
  );
}

/** List face: the name and today's state on the left, the count on the right. */
export function HabitRow({
  name,
  days,
  label,
  kind,
  color,
  checkedIn,
  status,
  onClick,
  className,
}: HabitFace & { status: string }) {
  return (
    <button
      type="button"
      data-slot="habit-row"
      data-habit-color={color}
      onClick={onClick}
      className={cn(
        tile,
        "flex min-h-[76px] items-center justify-between gap-4 rounded-[20px] px-[18px] py-3",
        className,
      )}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-base font-medium">{name}</span>
        <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          {kind === "build" && <CheckInTick checkedIn={checkedIn} className="size-4" />}
          {status}
        </span>
      </span>
      <span className="flex flex-none flex-col items-end gap-0.5">
        <span className="font-display text-[34px] leading-[0.95] font-medium tracking-[-0.04em] text-habit tabular-nums [font-stretch:96%]">
          {days}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </span>
    </button>
  );
}

/** The dashed "New habit" tile at the end of the grid or list. */
export function NewHabitTile({
  layout,
  onClick,
  className,
}: {
  layout: "grid" | "list";
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-slot="new-habit"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-center gap-2 border-[1.5px] border-dashed border-input text-sm font-medium text-muted-foreground outline-none",
        "transition-[border-color,color,transform,translate,scale] duration-120 ease-ui focus-visible:outline-2 focus-visible:outline-ring",
        "hover-fine:border-foreground hover-fine:text-foreground active:scale-[0.98]",
        layout === "grid" ? "h-[168px] flex-col rounded-3xl" : "min-h-[60px] rounded-[20px]",
        "[&_svg]:size-5 [&_svg]:stroke-[1.75]",
        className,
      )}
    >
      <Plus />
      <span>New habit</span>
    </button>
  );
}

/** Lays out habit faces as a grid of cards (two across on a phone) or a list of rows. */
export function HabitCollection({
  layout,
  className,
  children,
}: {
  layout: "grid" | "list";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ul
      key={layout}
      aria-label="Your habits"
      data-slot="habit-collection"
      data-layout={layout}
      className={cn(
        "grid animate-rise",
        layout === "grid"
          ? "grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5"
          : "grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))] gap-2",
        className,
      )}
    >
      {React.Children.map(children, (child) => (child ? <li>{child}</li> : null))}
    </ul>
  );
}
