import { matchesMedia } from "@streakky/ui/lib/media";

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** Whether the person asked for less motion, so screens swap and numbers land at once. */
export const prefersReducedMotion = () => matchesMedia(REDUCED_MOTION);
