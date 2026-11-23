import * as React from "react";
import { cn } from "@streakky/ui/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[52px] w-full min-w-0 rounded-2xl border border-input bg-transparent px-4 text-base text-foreground outline-hidden",
        "transition-[border-color,box-shadow] duration-140 ease-ui placeholder:text-muted-foreground/60",
        "focus:border-ring focus:ring-3 focus:ring-ring/18",
        "aria-invalid:border-destructive disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
