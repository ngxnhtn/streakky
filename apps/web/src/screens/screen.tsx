import type { ReactNode } from "react";
import { AppBar } from "@streakky/ui/components/app-bar";
import { cn } from "@streakky/ui/lib/utils";
import { useDesktop } from "./desktop.tsx";
import { BackButton, useScreenBelow, useSidebarPage } from "./stack.tsx";

/**
 * A screen: its heading and controls, over its scrolling body. In the phone layout that's an app
 * bar, with a back arrow on every screen over Home, or the heading big at the top of the body, as
 * on Home. In the desktop layout it's a page header with the heading big, its controls beside it,
 * and a back button on every screen but the sidebar's own pages, such as Sign in over Settings.
 *
 * The body stays in the same place in the page in both layouts, so a form keeps what was typed
 * into it when the window is resized across the two.
 */
export function Screen({
  title,
  eyebrow,
  bigTitle = false,
  left,
  right,
  actions,
  children,
}: {
  /** the screen's heading, which takes focus when it opens; none where the body has its own */
  title?: string;
  /** a line over a big heading, such as today's date */
  eyebrow?: string;
  /** phone: the heading big at the top of the body, under a bar without a title, as on Home */
  bigTitle?: boolean;
  /** phone: the app bar's left control, in place of the back arrow */
  left?: ReactNode;
  /** phone: the app bar's right control */
  right?: ReactNode;
  /** desktop: controls beside the heading */
  actions?: ReactNode;
  children: ReactNode;
}) {
  const desktop = useDesktop();
  const below = useScreenBelow();
  const sidebarPage = useSidebarPage();
  // on the desktop, a sidebar page has the sidebar to leave by
  const back = below !== null && !(desktop && sidebarPage);
  const header = desktop ? (
    <PageHeader back={back} eyebrow={eyebrow} title={title} actions={actions} />
  ) : bigTitle && title ? (
    <BigTitle eyebrow={eyebrow} title={title} />
  ) : null;
  return (
    <>
      {desktop ? null : (
        <AppBar
          left={left ?? (back ? <BackButton /> : undefined)}
          title={bigTitle ? undefined : title}
          right={right}
        />
      )}
      <main
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain",
          // the notices' height, their offset from the bottom and a gap above them, so scrolled
          // to the end nothing is left under them
          "pb-[max(4.5rem,calc(var(--notices-height,0rem)_+_max(0.5rem,env(safe-area-inset-bottom))_+_0.5rem))]",
          !desktop && "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {/* the bodies keep their own 1.25rem sides, inside the page's on the desktop */}
        <div
          className={cn(
            desktop &&
              "mx-auto w-full max-w-[73.75rem] px-7 pt-10 max-[56.25rem]:px-2 max-[56.25rem]:pt-7",
          )}
        >
          {header}
          {children}
        </div>
      </main>
    </>
  );
}

const bigHeading =
  "rounded-lg font-display leading-[1.05] font-medium focus-ring [font-stretch:96%] [overflow-wrap:anywhere]";

/** Phone: a heading big at the top of the body, with a line over it. */
function BigTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <header className="px-5 pt-1 pb-5">
      {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
      <h1 tabIndex={-1} className={cn(bigHeading, "mt-0.5 text-4xl tracking-[-0.032em]")}>
        {title}
      </h1>
    </header>
  );
}

/** Desktop: the page's heading, with a line over it, its controls beside it and a way back. */
function PageHeader({
  back,
  eyebrow,
  title,
  actions,
}: {
  back: boolean;
  eyebrow?: string;
  title?: string;
  actions?: ReactNode;
}) {
  if (!back && !title) return null;
  return (
    <header className="mb-7 px-5">
      {back && (
        <div className={cn("-ml-3", title && "mb-3")}>
          <BackButton labelled />
        </div>
      )}
      {title && (
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
            <h1
              tabIndex={-1}
              className={cn(bigHeading, "mt-0.5 text-[2.5rem] tracking-[-0.035em]")}
            >
              {title}
            </h1>
          </div>
          {actions && <div className="flex flex-none gap-2">{actions}</div>}
        </div>
      )}
    </header>
  );
}
