import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cn } from "@streakky/ui/lib/utils";

/**
 * A row of single-choice options (goal chips, colour swatches, app colours). Arrow keys move
 * between them; the chosen one can't be cleared by clicking it again.
 */
function ToggleGroup<T extends string>({
  className,
  value,
  onValueChange,
  ...props
}: Omit<
  React.ComponentProps<typeof ToggleGroupPrimitive.Root>,
  "type" | "value" | "onValueChange" | "defaultValue"
> & {
  value: T;
  onValueChange: (value: T) => void;
}) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      className={cn("flex flex-wrap gap-2", className)}
      {...props}
    />
  );
}

/** A pill chip: outlined, filled with the streak colour when chosen. */
function ToggleChip({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-chip"
      className={cn(
        "inline-flex h-11 min-w-14 items-center justify-center gap-1 rounded-full border border-input px-4 text-[15px] font-medium tabular-nums",
        "transition-[background-color,border-color,color,transform,translate,scale] duration-120 ease-ui outline-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "active:scale-96 active:duration-90 hover-fine:border-foreground",
        "data-[state=on]:border-streak data-[state=on]:bg-streak data-[state=on]:text-streak-foreground",
        "[&_svg]:size-3.5 [&_svg]:stroke-[2.25]",
        className,
      )}
      {...props}
    />
  );
}

/** The bare item, for custom option faces (swatches). */
function ToggleGroupItem(props: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return <ToggleGroupPrimitive.Item data-slot="toggle-group-item" {...props} />;
}

export { ToggleChip, ToggleGroup, ToggleGroupItem };
