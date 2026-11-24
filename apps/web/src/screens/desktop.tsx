import { createContext, useContext, type ReactNode } from "react";
import { DialogShapeProvider } from "@streakky/ui/components/dialog";
import { useMediaQuery } from "@streakky/ui/hooks/use-media-query";
import { insideNativeApp } from "../platform.ts";

/**
 * The desktop layout's windows: wide enough for the sidebar beside a page, and tall enough that a
 * phone turned on its side keeps the phone layout, as the Android app always does.
 */
const DESKTOP = "(min-width: 48rem) and (min-height: 30rem)";

const DesktopContext = createContext(false);

/**
 * Chooses the layout from the window's size, live as it changes: the desktop layout on a wide
 * screen, the phone layout on a narrow one, and always in the Android app (ticket 16). Dialogs
 * inside are sheets from the bottom in the phone layout, and centred on the desktop.
 */
export function DesktopProvider({ children }: { children: ReactNode }) {
  const desktop = useMediaQuery(DESKTOP) && !insideNativeApp();
  return (
    <DesktopContext.Provider value={desktop}>
      <DialogShapeProvider shape={desktop ? "center" : "sheet"}>{children}</DialogShapeProvider>
    </DesktopContext.Provider>
  );
}

/** Whether the app is in its desktop layout: the sidebar beside a page. */
export const useDesktop = () => useContext(DesktopContext);
