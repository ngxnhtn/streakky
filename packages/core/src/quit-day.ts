import { loggedDays, type QuitHabit } from "./habit.ts";

/**
 * The slips that moving a quit habit's quit day to `day` would make count again: slips kept but
 * not counted now, because they fall on or before the quit day, that would fall after the new
 * one. Only a move earlier brings any back. Such slips come from another device, say one that
 * logged a slip offline before this one moved the quit day past it.
 */
export function slipsCountedAgainByMovingQuitDay(h: QuitHabit, day: string): string[] {
  const countedNow = new Set(loggedDays(h));
  return loggedDays({ ...h, quitDay: day }).filter((slip) => !countedNow.has(slip));
}
