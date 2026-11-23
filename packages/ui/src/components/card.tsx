import * as React from "react";
import { cn } from "@streakky/ui/lib/utils";

/** An outlined panel for wide layouts. Its content may hold filled tiles; never a card in a card. */
function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="card"
      className={cn(
        "min-w-0 rounded-[28px] border border-border bg-card p-6 text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="card-title"
      className={cn("mb-[18px] text-base font-medium", className)}
      {...props}
    />
  );
}

export { Card, CardTitle };
