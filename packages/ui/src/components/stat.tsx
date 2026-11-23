import * as React from "react";
import { cn } from "@streakky/ui/lib/utils";

export function StatGrid({ className, ...props }: React.ComponentProps<"dl">) {
  return (
    <dl data-slot="stat-grid" className={cn("grid grid-cols-2 gap-2.5", className)} {...props} />
  );
}

/** A number with its unit, and what it counts under it. */
export function StatTile({
  value,
  unit,
  label,
  className,
}: {
  value: React.ReactNode;
  unit?: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      data-slot="stat"
      className={cn(
        "flex flex-col-reverse justify-end gap-1 rounded-[1.25rem] bg-muted px-4 pt-3.5 pb-4 transition-colors",
        className,
      )}
    >
      <dt className="text-[0.8125rem] text-muted-foreground">{label}</dt>
      <dd className="font-display text-[1.875rem] leading-[1.1] font-medium tracking-[-0.03em] tabular-nums">
        {value}
        {unit && (
          <span className="font-sans text-[0.9375rem] font-normal tracking-normal text-muted-foreground">
            {" "}
            {unit}
          </span>
        )}
      </dd>
    </div>
  );
}
