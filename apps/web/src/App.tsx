import { useLayoutEffect } from "react";
import { useMediaQuery } from "@streakky/ui/hooks/use-media-query";
import { applyAppearance, SYSTEM_DARK } from "./appearance.ts";
import { BottomNotices } from "./BottomNotices.tsx";
import { ArchivedHabits } from "./screens/ArchivedHabits.tsx";
import { HabitDetail } from "./screens/HabitDetail.tsx";
import { Home } from "./screens/Home.tsx";
import { DesktopProvider } from "./screens/desktop.tsx";
import { NewHabit, NewHabitProvider } from "./screens/NewHabitDialog.tsx";
import { Settings } from "./screens/Settings.tsx";
import { Sidebar } from "./screens/Sidebar.tsx";
import { SignIn } from "./screens/SignIn.tsx";
import { ScreenStack, type RouteTable } from "./screens/stack.tsx";
import { useSettings } from "./store/react.tsx";
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
export function App() {
  const { theme, palette } = useSettings();
  // re-applies when the system switches between light and dark
  const systemDark = useMediaQuery(SYSTEM_DARK);
  useLayoutEffect(() => applyAppearance({ theme, palette }), [theme, palette, systemDark]);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-background text-[0.9375rem] leading-[1.4] text-foreground transition-colors duration-300">
      <DesktopProvider>
        <NewHabitProvider>
          <BottomNotices appNotice={<UpdatePrompt />}>
            <ScreenStack routes={ROUTES} aside={<Sidebar />}>
              <NewHabit />
            </ScreenStack>
          </BottomNotices>
        </NewHabitProvider>
      </DesktopProvider>
    </div>
  );
}
