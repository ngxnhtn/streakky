import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@streakky/ui/components/button";
import { cn } from "@streakky/ui/lib/utils";

const text = "flex-1 py-2 pl-4 text-left text-muted-foreground";

/**
 * One small note in a pill over a screen's content, such as a one-time hint, with a button that
 * dismisses it. With `onClick`, the note's text is a button too, and a `NoteLink` in it shows
 * where it leads.
 */
export function Note({
  children,
  onClick,
  dismissLabel,
  onDismiss,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  /** the dismiss button's name, such as "Dismiss the hint" */
  dismissLabel: string;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <div
      data-slot="note"
      className={cn(
        "flex items-center gap-1 rounded-2xl bg-muted py-1 pr-1 text-[0.875rem] leading-snug",
        className,
      )}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={cn(
            text,
            "min-h-11 rounded-2xl focus-ring-flush",
            "hover-fine:[&_[data-slot=note-link]]:decoration-current",
          )}
        >
          {children}
        </button>
      ) : (
        <p className={text}>{children}</p>
      )}
      <Button variant="ghost" size="icon" aria-label={dismissLabel} onClick={onDismiss}>
        <X strokeWidth={1.75} />
      </Button>
    </div>
  );
}

/** The part of a note's text that says where it leads, underlined. */
export function NoteLink({ children }: { children: React.ReactNode }) {
  return (
    <span
      data-slot="note-link"
      className="font-medium text-foreground underline decoration-input underline-offset-4"
    >
      {children}
    </span>
  );
}
