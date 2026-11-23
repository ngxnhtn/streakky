import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@streakky/ui/lib/utils";

/**
 * Pill buttons. On a fine pointer a button steps up 1px on hover; every press sinks 1px and
 * scales .985. `ring` is the circled icon button (the wireframe's ⊕).
 */
const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none",
    "transition-[background-color,color,box-shadow,transform,translate,scale] duration-120 ease-ui outline-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:translate-y-px active:scale-[0.985] active:duration-90",
    "hover-fine:not-active:-translate-y-px hover-fine:duration-150",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover-fine:bg-primary-hover",
        secondary: "bg-secondary text-secondary-foreground hover-fine:bg-press",
        outline:
          "bg-transparent text-foreground shadow-[inset_0_0_0_1px_var(--input)] hover-fine:bg-muted",
        ghost:
          "text-foreground hover-fine:bg-muted hover-fine:not-active:translate-y-0 active:translate-y-0 active:scale-92",
        ring: "text-foreground before:absolute before:inset-[3px] before:rounded-full before:border-[1.5px] before:border-current hover-fine:bg-muted hover-fine:not-active:translate-y-0 active:translate-y-0 active:scale-92",
        destructive:
          "bg-destructive text-destructive-foreground hover-fine:bg-[color-mix(in_oklab,var(--destructive)_86%,var(--foreground))]",
        "outline-destructive":
          "bg-transparent text-destructive shadow-[inset_0_0_0_1px_var(--input)] hover-fine:bg-muted",
        streak:
          "bg-streak text-streak-foreground hover-fine:bg-[color-mix(in_oklab,var(--streak)_86%,var(--foreground))]",
        link: "text-foreground underline decoration-input underline-offset-4 hover-fine:decoration-current hover-fine:not-active:translate-y-0",
      },
      size: {
        default: "h-[52px] px-6 text-base",
        sm: "h-9 px-3.5 text-sm",
        lg: "h-14 px-7 text-base",
        icon: "size-11",
        "icon-sm": "size-10 [&_svg:not([class*='size-'])]:size-[18px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...(asChild ? {} : { type: "button" as const })}
      {...props}
    />
  );
}

export { Button, buttonVariants };
