import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@streakky/ui/lib/utils";

/** The knob slides 1.25rem and stretches 0.25rem while pressed. */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group/switch relative inline-flex h-8 w-[3.25rem] shrink-0 items-center rounded-full bg-input p-[0.1875rem] transition-colors duration-180 outline-hidden",
        "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:opacity-40 data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "block h-[1.625rem] w-[1.625rem] rounded-full bg-background shadow-[0_1px_0.1875rem_rgb(0_0_0/0.2)] transition-[transform,width,translate,scale] duration-180 ease-ui",
          "group-active/switch:w-[1.875rem] data-[state=checked]:translate-x-5 group-active/switch:data-[state=checked]:translate-x-4",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
