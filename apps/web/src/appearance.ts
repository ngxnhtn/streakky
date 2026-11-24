import type { Settings } from "@streakky/core";
import { matchesMedia } from "@streakky/ui/lib/media";

/** Whether the system is in dark mode, which the `system` theme follows. */
export const SYSTEM_DARK = "(prefers-color-scheme: dark)";

/**
 * Puts the device's theme and palette on the page, where the design system reads them
 * (`data-palette` and the `dark` class), and matches the browser's theme colour to the ground.
 * Returns whether the page is dark.
 */
export function applyAppearance({ theme, palette }: Pick<Settings, "theme" | "palette">): boolean {
  const root = document.documentElement;
  root.dataset.palette = palette;
  const dark = theme === "dark" || (theme === "system" && matchesMedia(SYSTEM_DARK));
  root.classList.toggle("dark", dark);
  const ground = getComputedStyle(root).getPropertyValue("--background").trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", ground);
  return dark;
}
