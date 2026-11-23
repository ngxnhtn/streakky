import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cn } from "@streakky/ui/lib/utils";

/**
 * The pill track both segmented controls share: one ink pill slides to the chosen option by
 * transform alone. `--n` options, the chosen one at `--i`.
 */
export const segmentTrack =
  "relative grid h-11 grid-cols-[repeat(var(--n),minmax(0,1fr))] rounded-full bg-muted p-[3px] transition-colors";
export const segmentPill =
  "pointer-events-none absolute inset-y-[3px] left-[3px] w-[calc((100%-6px)/var(--n))] translate-x-[calc(var(--i)*100%)] rounded-full bg-habit transition-transform duration-240 ease-ui";
export const segmentItem =
  "relative z-10 flex items-center justify-center rounded-full px-2 text-sm font-medium text-foreground transition-colors duration-240 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=on]:text-habit-foreground data-[state=active]:text-habit-foreground [&_svg]:size-[18px]";

const sizes = { md: "h-11", sm: "h-10", xs: "h-9 text-[13px]" } as const;

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  /** shown instead of the label, which becomes its accessible name */
  icon?: React.ReactNode;
};

/** A single choice from two to four options (theme, layout, calendar view, build or quit). */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  label,
  size = "md",
  className,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentOption<T>[];
  label: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      aria-label={label}
      data-slot="segmented"
      className={cn(segmentTrack, sizes[size], className)}
      style={{ "--n": options.length, "--i": index } as React.CSSProperties}
    >
      <span aria-hidden="true" className={segmentPill} />
      {options.map((o) => (
        <ToggleGroupPrimitive.Item
          key={o.value}
          value={o.value}
          aria-label={o.icon ? o.label : undefined}
          className={cn(segmentItem, size === "xs" && "text-[13px]")}
        >
          {o.icon ?? o.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}
