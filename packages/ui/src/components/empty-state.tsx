import * as React from "react";
import { cn } from "@streakky/ui/lib/utils";

/**
 * What a screen says when it has nothing to show: a heading, a line on why or what to do, and an
 * optional action under it, such as a full-width button.
 */
export function EmptyState({
  title,
  children,
  action,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  title: string;
  /** the line under the heading */
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn("max-w-[30rem] rounded-3xl bg-muted px-6 pt-7 pb-6", className)}
      {...props}
    >
      <h2 className="text-xl font-medium tracking-[-0.015em]">{title}</h2>
      <p className="mt-1.5 text-muted-foreground">{children}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
