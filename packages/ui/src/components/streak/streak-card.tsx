import * as React from "react";
import { Check, Plus } from "lucide-react";
import type { ColorId, Mode } from "@streakky/core";
import { cn } from "@streakky/ui/lib/utils";

/** Today's state on a build streak: an empty ring, filled with a tick once logged. */
export function StreakTick({ done, className }: { done: boolean; className?: string }) {
  return (
    <span
      data-slot="streak-tick"
      className={cn(
        "grid size-[22px] flex-none place-items-center rounded-full text-streak-foreground",
        done ? "bg-streak" : "shadow-[inset_0_0_0_1.5px_var(--streak)]",
        className,
      )}
    >
      {done && <Check strokeWidth={2.5} className="size-[60%]" />}
    </span>
  );
}

const tile = [
  "w-full border border-transparent text-left outline-none",
  "bg-streak/9 dark:bg-streak/16",
  "transition-[transform,border-color,box-shadow,background-color,translate,scale] duration-120 ease-ui",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  "hover-fine:-translate-y-0.5 hover-fine:border-input hover-fine:shadow-[0_12px_24px_-14px_rgb(0_0_0/0.28)] hover-fine:duration-180",
  "active:scale-[0.98] active:duration-90",
].join(" ");

type StreakFace = {
  name: string;
  days: number;
  /** under the count: "day streak", "days free" */
  label: string;
  mode: Mode;
  color: ColorId;
  /** build streaks: logged today */
  done: boolean;
  onClick: () => void;
  className?: string;
};

/** Grid face: the name on top, the big count in the streak's colour at the bottom. */
export function StreakCard({
  name,
  days,
  label,
  mode,
  color,
  done,
  onClick,
  className,
}: StreakFace) {
  return (
    <button
      type="button"
      data-slot="streak-card"
      data-streak-color={color}
      onClick={onClick}
      aria-label={`${name}: ${days} ${label}${mode === "build" ? (done ? ", done today" : ", not logged today") : ""}`}
      className={cn(tile, "flex h-[168px] flex-col rounded-3xl p-4", className)}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-sm leading-tight font-medium">{name}</span>
        {mode === "build" && <StreakTick done={done} className="-mt-px -mr-0.5" />}
      </span>
      <span className="mt-auto font-display text-[52px] leading-[0.9] font-medium tracking-[-0.045em] text-streak tabular-nums [font-stretch:96%]">
        {days}
      </span>
      <span className="mt-1.5 text-[13px] text-muted-foreground">{label}</span>
    </button>
  );
}

/** List face: the name and today's state on the left, the count on the right. */
export function StreakRow({
  name,
  days,
  label,
  mode,
  color,
  done,
  status,
  onClick,
  className,
}: StreakFace & { status: string }) {
  return (
    <button
      type="button"
      data-slot="streak-row"
      data-streak-color={color}
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
          {mode === "build" && <StreakTick done={done} className="size-4" />}
          {status}
        </span>
      </span>
      <span className="flex flex-none flex-col items-end gap-0.5">
        <span className="font-display text-[34px] leading-[0.95] font-medium tracking-[-0.04em] text-streak tabular-nums [font-stretch:96%]">
          {days}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </span>
    </button>
  );
}

/** The dashed "New streak" tile at the end of the grid or list. */
export function NewStreakTile({
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
      data-slot="new-streak"
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
      <span>New streak</span>
    </button>
  );
}

/** Lays out streak faces as a grid of cards (two across on a phone) or a list of rows. */
export function StreakCollection({
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
      aria-label="Your streaks"
      data-slot="streak-collection"
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
