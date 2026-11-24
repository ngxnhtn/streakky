import type { Settings } from "@streakky/core";
import { matchesMedia } from "@streakky/ui/lib/media";

/** Whether the system is in dark mode, which the `system` theme follows. */
export const SYSTEM_DARK = "(prefers-color-scheme: dark)";

/**
 * Puts the device's theme and palette on the page, where the design system reads them
 * (`data-palette` and the `dark` class), and matches the browser's theme colour to the ground.
 */
export function applyAppearance({ theme, palette }: Pick<Settings, "theme" | "palette">) {
  const root = document.documentElement;
  root.dataset.palette = palette;
  root.classList.toggle(
    "dark",
    theme === "dark" || (theme === "system" && matchesMedia(SYSTEM_DARK)),
  );
  const ground = getComputedStyle(root).getPropertyValue("--background").trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", ground);
}
