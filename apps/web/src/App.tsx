import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { applyAppearance } from "./appearance.ts";
import { ArchivedHabits } from "./screens/ArchivedHabits.tsx";
import { HabitDetail } from "./screens/HabitDetail.tsx";
import { Home } from "./screens/Home.tsx";
import { Settings } from "./screens/Settings.tsx";
import { SignIn } from "./screens/SignIn.tsx";
import { ScreenStack, type Route } from "./screens/stack.tsx";
import { useSettings } from "./store/react.tsx";
import { UpdatePrompt } from "./UpdatePrompt.tsx";

/** The phone layout: a stack of screens filling the window, in this device's theme and palette. */
export function App() {
  const { theme, palette } = useSettings();
  // re-applies when the system switches between light and dark
  const systemDark = useMedia("(prefers-color-scheme: dark)");
  useLayoutEffect(() => applyAppearance({ theme, palette }), [theme, palette, systemDark]);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-background text-[0.9375rem] leading-[1.4] text-foreground transition-colors duration-300">
      <ScreenStack screen={screenOf} />
      <UpdatePrompt />
    </div>
  );
}

function screenOf(route: Route): ReactNode {
  switch (route.name) {
    case "home":
      return <Home />;
    case "detail":
      return <HabitDetail id={route.id} />;
    case "settings":
      return <Settings />;
    case "sign-in":
      return <SignIn />;
    case "archived":
      return <ArchivedHabits />;
  }
}

function useMedia(query: string): boolean {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatch(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return match;
}
