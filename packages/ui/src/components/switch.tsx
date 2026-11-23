import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@streakky/ui/lib/utils";

/** The knob slides 20px and stretches 4px while pressed. */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group/switch relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full bg-input p-[3px] transition-colors duration-180 outline-hidden",
        "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:opacity-40 data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "block h-[26px] w-[26px] rounded-full bg-background shadow-[0_1px_3px_rgb(0_0_0/0.2)] transition-[transform,width,translate,scale] duration-180 ease-ui",
          "group-active/switch:w-[30px] data-[state=checked]:translate-x-5 group-active/switch:data-[state=checked]:translate-x-4",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
