import * as React from "react";
import { cn } from "@streakky/ui/lib/utils";

/**
 * A phone screen's top bar: one control each side, the title centred between them. The title is
 * the screen's heading, and takes focus (tabIndex -1) when the screen opens.
 */
export function AppBar({
  left,
  title,
  right,
  className,
}: {
  left?: React.ReactNode;
  title?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="app-bar"
      className={cn(
        "grid h-14 flex-none grid-cols-[3.5rem_1fr_3.5rem] items-center px-2",
        className,
      )}
    >
      <div>{left}</div>
      {title ? (
        <h1
          tabIndex={-1}
          className="truncate rounded-lg text-center text-base font-medium focus-ring"
        >
          {title}
        </h1>
      ) : (
        <span />
      )}
      <div className="justify-self-end">{right}</div>
    </div>
  );
}
