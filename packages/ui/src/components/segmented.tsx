import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cn } from "@streakky/ui/lib/utils";

/**
 * The pill track both segmented controls share: one ink pill slides to the chosen option by
 * transform alone. `--n` options, the chosen one at `--i`.
 */
export const segmentTrack =
  "relative grid h-11 grid-cols-[repeat(var(--n),minmax(0,1fr))] rounded-full bg-muted p-[0.1875rem] transition-colors";
export const segmentPill =
  "pointer-events-none absolute inset-y-[0.1875rem] left-[0.1875rem] w-[calc((100%-0.375rem)/var(--n))] translate-x-[calc(var(--i)*100%)] rounded-full bg-habit transition-transform duration-240 ease-ui";
export const segmentItem =
  "tap-target relative z-10 flex items-center justify-center rounded-full px-2 text-sm font-medium text-foreground transition-colors duration-240 focus-ring data-[state=on]:text-habit-foreground data-[state=active]:text-habit-foreground [&_svg]:size-[1.125rem]";

const sizes = { md: "h-11", sm: "h-10", xs: "h-9" } as const;

export type SegmentOption<T extends string | number> = {
  value: T;
  label: string;
  /** shown instead of the label, which becomes its accessible name */
  icon?: React.ReactNode;
};

/**
 * A single choice from two to four options (theme, layout, calendar view, build or quit). The
 * values may be strings or numbers, such as a weekday.
 */
export function Segmented<T extends string | number>({
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
      // Radix keeps string values; each option's own value goes back out
      value={String(value)}
      onValueChange={(chosen) => {
        const option = options.find((o) => String(o.value) === chosen);
        if (option) onValueChange(option.value);
      }}
      aria-label={label}
      data-slot="segmented"
      className={cn(segmentTrack, sizes[size], className)}
      style={{ "--n": options.length, "--i": index } as React.CSSProperties}
    >
      <span aria-hidden="true" className={segmentPill} />
      {options.map((o) => (
        <ToggleGroupPrimitive.Item
          key={o.value}
          value={String(o.value)}
          aria-label={o.icon ? o.label : undefined}
          className={cn(segmentItem, size === "xs" && "text-[0.8125rem]")}
        >
          {o.icon ?? o.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}
