import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { Home } from "./screens/Home.tsx";
import { Settings } from "./screens/Settings.tsx";
import { ScreenStack, type Route } from "./screens/stack.tsx";
import { useSettings } from "./store/react.tsx";
import { UpdatePrompt } from "./UpdatePrompt.tsx";

/** The phone layout: a stack of screens filling the window, in this device's theme and palette. */
export function App() {
  const { theme, palette } = useSettings();
  const systemDark = useMedia("(prefers-color-scheme: dark)");
  const dark = theme === "dark" || (theme === "system" && systemDark);

  // the design system reads its theme from the page: data-palette and the dark class
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.palette = palette;
    root.classList.toggle("dark", dark);
    const ground = getComputedStyle(root).getPropertyValue("--background").trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", ground);
  }, [palette, dark]);

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
    case "settings":
      return <Settings />;
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
