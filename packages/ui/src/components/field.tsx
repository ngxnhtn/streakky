import * as React from "react";
import { Label } from "@streakky/ui/components/label";
import { cn } from "@streakky/ui/lib/utils";

/**
 * A labelled form control with an optional hint and an error under it. Pass the control a
 * render function to get the ids it needs.
 */
export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
}) {
  const id = React.useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  // the error takes the hint's place, so the control is described by whichever shows
  const describedBy = error ? errId : hint ? hintId : undefined;
  return (
    <div data-slot="field" className={cn("grid min-w-0 gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="text-[0.8125rem] text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="text-[0.8125rem] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** A labelled group of choices (chips, swatches) that isn't a single input. */
export function FieldSet({
  legend,
  className,
  children,
}: {
  legend: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset data-slot="fieldset" className={cn("grid min-w-0 gap-2 border-0 p-0", className)}>
      <legend className="mb-2 p-0 text-[0.8125rem] font-medium text-muted-foreground">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}
