import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { usePortalContainer } from "@streakky/ui/components/portal";
import { cn } from "@streakky/ui/lib/utils";

/**
 * One dialog, two shapes: `sheet` rises from the bottom (phones), `center` sits in the middle
 * (wide screens). Escape and the scrim close it; focus returns to what opened it.
 */
function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  const container = usePortalContainer();
  return <DialogPrimitive.Portal data-slot="dialog-portal" container={container} {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-scrim data-open:animate-fade-in data-closed:animate-fade-out",
        className,
      )}
      {...props}
    />
  );
}

type Shape = "sheet" | "center";

const shapes: Record<Shape, string> = {
  sheet:
    "inset-x-2 bottom-2 max-h-[calc(100%-64px)] rounded-[32px] px-5 pt-2.5 pb-6 data-open:animate-sheet-in data-closed:animate-sheet-out",
  center:
    "top-1/2 left-1/2 w-[min(440px,calc(100%-48px))] max-h-[calc(100%-96px)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] p-7 data-open:animate-dialog-in data-closed:animate-dialog-out",
};

function DialogContent({
  className,
  children,
  shape = "center",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { shape?: Shape }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-shape={shape}
        aria-describedby={undefined}
        className={cn(
          "fixed z-50 overflow-y-auto bg-popover text-popover-foreground shadow-[0_-8px_40px_rgb(0_0_0/0.14)] outline-none",
          shapes[shape],
          className,
        )}
        {...props}
      >
        {shape === "sheet" && (
          <span
            aria-hidden="true"
            className="mx-auto mb-4 block h-[5px] w-9 rounded-full bg-input"
          />
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("mb-4 font-display text-[22px] font-medium tracking-[-0.02em]", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("-mt-1.5 mb-5 text-[15px] text-muted-foreground", className)}
      {...props}
    />
  );
}

function DialogActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-actions" className={cn("grid gap-2", className)} {...props} />;
}

export {
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
