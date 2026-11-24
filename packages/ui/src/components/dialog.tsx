import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { usePortalContainer } from "@streakky/ui/components/portal";
import { cn } from "@streakky/ui/lib/utils";

/**
 * One dialog, two shapes: `sheet` rises from the bottom (phones), `center` sits in the middle
 * (wide screens). Escape and the scrim close it; focus returns to what opened it (see
 * `DialogContent`).
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

const DialogShapeContext = React.createContext<Shape>("center");

/**
 * The shape of every dialog inside that doesn't name its own, such as sheets in an app's phone
 * layout and centred dialogs in its desktop layout. Without one, dialogs are centred.
 */
function DialogShapeProvider({ shape, children }: { shape: Shape; children: React.ReactNode }) {
  return <DialogShapeContext.Provider value={shape}>{children}</DialogShapeContext.Provider>;
}

const shapes: Record<Shape, string> = {
  sheet:
    "right-(--edge-right) bottom-(--edge-bottom) left-(--edge-left) max-h-[calc(100%-4rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] rounded-[2rem] px-5 pt-2.5 pb-6 data-open:animate-sheet-in data-closed:animate-sheet-out",
  center:
    "top-1/2 left-1/2 w-[min(27.5rem,calc(100%-3rem))] max-h-[calc(100%-6rem)] -translate-x-1/2 -translate-y-1/2 rounded-[1.75rem] p-7 data-open:animate-dialog-in data-closed:animate-dialog-out",
};

/**
 * The dialog itself. Focus starts where `initialFocus` says, and goes back to what had focus when
 * it opened once it has closed: these dialogs open without a DialogTrigger, the only place Radix
 * would give it back to. Don't autoFocus a control inside as it opens; that hides the opener.
 */
function DialogContent({
  className,
  children,
  shape: ownShape,
  initialFocus = "first",
  returnFocus,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  /** its own shape; otherwise the `DialogShapeProvider`'s around it, or centred */
  shape?: Shape;
  /**
   * Where focus starts: `"first"`, the first control (Radix's way); `"content"`, the dialog itself,
   * so a phone's keyboard waits until a field is chosen; or a control's ref, such as the safe
   * choice of a question, so a second Enter doesn't take the other.
   */
  initialFocus?: "first" | "content" | React.RefObject<HTMLElement | null>;
  /**
   * Where focus goes once it has closed, given what had focus when it opened: by default that
   * opener, if it's still in the page. Return null to leave focus be, as when another dialog
   * takes over.
   */
  returnFocus?: (opener: HTMLElement | null) => HTMLElement | null | undefined;
}) {
  const providedShape = React.useContext(DialogShapeContext);
  const shape = ownShape ?? providedShape;
  const opener = React.useRef<HTMLElement | null>(null);
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-shape={shape}
        aria-describedby={undefined}
        className={cn(
          "fixed z-50 overflow-y-auto bg-popover text-popover-foreground shadow-[0_-0.5rem_2.5rem_rgb(0_0_0/0.14)] outline-hidden",
          shapes[shape],
          className,
        )}
        onOpenAutoFocus={(event) => {
          const focused = document.activeElement;
          opener.current = focused instanceof HTMLElement ? focused : null;
          onOpenAutoFocus?.(event);
          if (event.defaultPrevented || initialFocus === "first") return;
          event.preventDefault();
          const start = initialFocus === "content" ? event.currentTarget : initialFocus.current;
          if (start instanceof HTMLElement) start.focus();
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          if (event.defaultPrevented) return;
          event.preventDefault();
          const next = returnFocus ? returnFocus(opener.current) : opener.current;
          if (next?.isConnected) next.focus();
        }}
        {...props}
      >
        {shape === "sheet" && (
          <span
            aria-hidden="true"
            className="mx-auto mb-4 block h-[0.3125rem] w-9 rounded-full bg-input"
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
      className={cn("mb-4 font-display text-[1.375rem] font-medium tracking-[-0.02em]", className)}
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
      className={cn("-mt-1.5 mb-5 text-[0.9375rem] text-muted-foreground", className)}
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
  DialogShapeProvider,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
