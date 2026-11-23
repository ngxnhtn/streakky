import * as React from "react";
import { cn } from "@streakky/ui/lib/utils";

/** A titled group of rows (settings, options): a filled, rounded list with hairlines between. */
export function ListGroup({
  title,
  className,
  children,
}: {
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <section
      data-slot="list-group"
      aria-labelledby={title ? id : undefined}
      className={cn("mt-6 first:mt-2", className)}
    >
      {title && (
        <h2 id={id} className="mx-1 mb-2.5 text-[0.8125rem] font-medium text-muted-foreground">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export function List({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="list"
      className={cn(
        "overflow-hidden rounded-[1.25rem] bg-muted transition-colors [&>li+li]:border-t [&>li+li]:border-border",
        className,
      )}
      {...props}
    />
  );
}

const row = "flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2.5 text-left";

/** A static row: a label on the left, a control on the right (or stacked with `stacked`). */
export function ListItem({
  className,
  stacked,
  ...props
}: React.ComponentProps<"li"> & { stacked?: boolean }) {
  return (
    <li
      data-slot="list-item"
      className={cn(row, stacked && "flex-col items-stretch gap-2.5 py-3.5", className)}
      {...props}
    />
  );
}

/** A tappable row with a trailing icon. */
export function ListButton({
  className,
  tone,
  ...props
}: React.ComponentProps<"button"> & { tone?: "destructive" }) {
  return (
    <li>
      <button
        type="button"
        data-slot="list-button"
        className={cn(
          row,
          "text-[0.9375rem] font-medium transition-colors duration-120 ease-ui",
          "focus-visible:-outline-offset-2 focus-ring-flush",
          "hover-fine:bg-accent hover-fine:duration-150 active:bg-press active:duration-90 disabled:opacity-40",
          "[&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:stroke-[1.75] [&_svg]:text-muted-foreground",
          tone === "destructive" && "text-destructive [&_svg]:text-destructive",
          className,
        )}
        {...props}
      />
    </li>
  );
}

export function ListLabel({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("text-[0.9375rem] font-medium", className)} {...props} />;
}
