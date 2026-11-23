import type { Settings } from "@streakky/core";

const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

/**
 * Puts the device's theme and palette on the page, where the design system reads them
 * (`data-palette` and the `dark` class), and matches the browser's theme colour to the ground.
 */
export function applyAppearance({ theme, palette }: Pick<Settings, "theme" | "palette">) {
  const root = document.documentElement;
  root.dataset.palette = palette;
  root.classList.toggle("dark", theme === "dark" || (theme === "system" && systemDark()));
  const ground = getComputedStyle(root).getPropertyValue("--background").trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", ground);
}
