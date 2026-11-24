import { useLayoutEffect, useMemo } from "react";
import { useMediaQuery } from "@streakky/ui/hooks/use-media-query";
import { applyAppearance, SYSTEM_DARK } from "./appearance.ts";
import { PlatformProvider, type Platform } from "./platform.ts";
import { BottomNotices } from "./BottomNotices.tsx";
import { ArchivedHabits } from "./screens/ArchivedHabits.tsx";
import { HabitDetail } from "./screens/HabitDetail.tsx";
import { Home } from "./screens/Home.tsx";
import { DesktopProvider } from "./screens/desktop.tsx";
import { NewHabit, NewHabitProvider } from "./screens/NewHabitDialog.tsx";
import { ReminderSchedule } from "./screens/Reminder.tsx";
import { WidgetSummaries } from "./screens/Widgets.tsx";
import { Settings } from "./screens/Settings.tsx";
import { Sidebar } from "./screens/Sidebar.tsx";
import { SignIn } from "./screens/SignIn.tsx";
import { ScreenStack, type Route, type RouteTable } from "./screens/stack.tsx";
import { useHabitStore, useSettings } from "./store/react.tsx";
import { UpdatePrompt } from "./UpdatePrompt.tsx";

/** Every screen, by its route's name. */
const ROUTES: RouteTable = {
  home: { screen: () => <Home />, backLabel: "Back to habits" },
  detail: {
    screen: ({ id }) => <HabitDetail id={id} />,
    backLabel: "Back to the habit",
    sidebarPage: true,
    valid: ({ id }) => typeof id === "string",
  },
  settings: {
    screen: () => <Settings />,
    backLabel: "Back to settings",
    fromLeft: true,
    sidebarPage: true,
  },
  "sign-in": {
    screen: ({ email }) => <SignIn email={email ?? null} />,
    backLabel: "Back to sign-in",
    valid: ({ email }) => email === undefined || typeof email === "string",
  },
  archived: { screen: () => <ArchivedHabits />, backLabel: "Back to archived habits" },
};

/**
 * The app in this device's theme and palette: its screens filling the window, in the phone layout
 * or, on a wide screen, the desktop layout with the sidebar beside them, and the notices along the
 * bottom over them.
 */
export function App({ platform }: { platform: Platform }) {
  const { theme, palette } = useSettings();
  // re-applies when the system switches between light and dark
  const systemDark = useMediaQuery(SYSTEM_DARK);
  const store = useHabitStore();
  // a habit opened from its widget shows, if it's still here, active or archived; else Home
  const links = useMemo(() => {
    const habitLinks = platform.habitLinks;
    if (!habitLinks) return undefined;
    return (show: (route: Route) => void) =>
      habitLinks((id) => {
        const here = [...store.habits(), ...store.archivedHabits()].some((h) => h.id === id);
        show(here ? { name: "detail", id } : { name: "home" });
      });
  }, [platform, store]);
  useLayoutEffect(() => {
    const dark = applyAppearance({ theme, palette });
    platform.systemBars?.(dark);
  }, [platform, theme, palette, systemDark]);

  return (
    // In the Android app and an installed web app the page reaches under the status bar and the
    // screen's rounded edges (viewport-fit=cover); the app keeps inside them, its ground beneath.
    <div className="relative flex h-dvh flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] text-[0.9375rem] leading-[1.4] text-foreground transition-colors duration-300">
      <PlatformProvider value={platform}>
        {platform.reminders && <ReminderSchedule reminders={platform.reminders} />}
        {platform.widgets && <WidgetSummaries widgets={platform.widgets} />}
        <DesktopProvider>
          <NewHabitProvider>
            <BottomNotices appNotice={<UpdatePrompt />}>
              <ScreenStack
                routes={ROUTES}
                aside={<Sidebar />}
                backButton={platform.backButton}
                links={links}
              >
                <NewHabit />
              </ScreenStack>
            </BottomNotices>
          </NewHabitProvider>
        </DesktopProvider>
      </PlatformProvider>
    </div>
  );
}
