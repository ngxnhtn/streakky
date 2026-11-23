import { Check, RotateCcw } from "lucide-react";
import type { Kind } from "@streakky/core";
import { cn } from "@streakky/ui/lib/utils";

const base = [
  "inline-flex h-[52px] min-w-[220px] items-center justify-center gap-2.5 rounded-full text-base font-medium",
  "transition-[background-color,color,transform,box-shadow,translate,scale] duration-200 ease-ui outline-hidden",
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
  "active:translate-y-px active:scale-[0.985] active:duration-90 hover-fine:not-active:-translate-y-px",
  "disabled:pointer-events-none disabled:opacity-40",
].join(" ");

/**
 * The action under the counter. Build: "Check in today", then "Checked in today · Undo" (a toggle).
 * Quit: "I slipped today" (ask before calling onSlip), then "Undo today's slip".
 */
export function TodayButton({
  kind,
  loggedToday,
  disabled,
  onToggle,
  onSlip,
  className,
}: {
  kind: Kind;
  /** build: checked in today; quit: a slip logged today */
  loggedToday: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onSlip: () => void;
  className?: string;
}) {
  if (kind === "build") {
    return (
      <button
        type="button"
        aria-pressed={loggedToday}
        onClick={onToggle}
        className={cn(
          base,
          "pr-6 pl-4",
          loggedToday
            ? "bg-habit/20 text-foreground hover-fine:bg-habit/28 dark:bg-muted dark:hover-fine:bg-accent"
            : "bg-habit text-habit-foreground hover-fine:bg-[color-mix(in_oklab,var(--habit)_86%,var(--foreground))]",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "grid size-[26px] place-items-center rounded-full",
            loggedToday
              ? "animate-tick-pop bg-habit text-habit-foreground"
              : "shadow-[inset_0_0_0_1.75px_currentColor]",
          )}
        >
          <Check
            strokeWidth={2.25}
            className={cn(
              "size-[15px] transition-[opacity,transform,translate,scale] duration-300 ease-enter",
              loggedToday ? "scale-100 opacity-100" : "scale-40 opacity-0",
            )}
          />
        </span>
        {loggedToday ? "Checked in today" : "Check in today"}
        {loggedToday && (
          <span className="ml-1 text-sm font-normal text-muted-foreground">Undo</span>
        )}
      </button>
    );
  }
  const quiet = cn(
    base,
    "px-6 text-foreground shadow-[inset_0_0_0_1px_var(--input)] hover-fine:bg-accent hover-fine:shadow-[inset_0_0_0_1px_var(--foreground)]",
    className,
  );
  return loggedToday ? (
    <button type="button" onClick={onToggle} className={quiet}>
      Undo today's slip
    </button>
  ) : (
    <button type="button" onClick={onSlip} disabled={disabled} className={quiet}>
      <RotateCcw strokeWidth={1.75} className="size-5 text-muted-foreground" />I slipped today
    </button>
  );
}
