import { useEffect, useLayoutEffect, useState } from "react";
import { Home } from "./screens/Home.tsx";

/** The phone layout: one screen filling the window. Colours follow the system until Settings exist. */
export function App() {
  const dark = useMedia("(prefers-color-scheme: dark)");
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.palette = "teal";
    root.classList.toggle("dark", dark);
    const ground = getComputedStyle(root).getPropertyValue("--background").trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", ground);
  }, [dark]);

  return (
    <div className="flex h-dvh flex-col bg-background text-[15px] leading-[1.4] text-foreground transition-colors duration-300">
      <Home />
    </div>
  );
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
