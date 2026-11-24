import { createContext, useContext } from "react";
import type { Reminder, WidgetSummary } from "@streakky/core";
import type { WidgetLook } from "./widget-look.ts";

/**
 * Inside the Android app (ticket 16), Capacitor's bridge defines `window.Capacitor` before the
 * app's scripts run. A plain browser has no such global, so there this is always false.
 */
export const insideNativeApp = () =>
  (
    globalThis as typeof globalThis & { Capacitor?: { isNativePlatform?: () => boolean } }
  ).Capacitor?.isNativePlatform?.() === true;

/** What the app takes from the platform it runs on, beyond a browser's: none of it on the web. */
export type Platform = {
  /**
   * Android's back button: calls `back` on each press, which goes back in the app and says whether
   * it did. When Home has nothing to go back from, it returns false, and the app closes.
   */
  backButton?: (back: () => boolean) => () => void;
  /** Makes the status and navigation bars' icons light over a dark theme, dark over a light one. */
  systemBars?: (dark: boolean) => void;
  /** The daily reminder's notifications (ticket 19), in the Android app only. */
  reminders?: Reminders;
  /**
   * The home-screen widgets (tickets 20 and 21), in the Android app only: takes every active and
   * archived habit's summary, which the widgets count from, and the app's look, which they're
   * drawn in, and draws them again. Without a look they keep the last one.
   */
  widgets?: { update(summaries: WidgetSummary[], look?: WidgetLook): Promise<void> };
  /**
   * Habits opened from outside the app, as by tapping a widget: calls `open` with each one's id,
   * the one the app was opened on included, and returns a function that stops.
   */
  habitLinks?: (open: (habitId: string) => void) => () => void;
};

/** Notifications for the daily reminder. */
export type Reminders = {
  /** Whether the app may show notifications. */
  allowed(): Promise<boolean>;
  /** Asks the person to let the app show notifications, if it hasn't asked; whether it may. */
  allow(): Promise<boolean>;
  /**
   * Puts these reminders in place of every one scheduled before. One already shown is taken away
   * once it's out of date: an earlier day's, or today's once `stillToday` is empty, as when every
   * build habit is checked in or the reminder is off.
   */
  schedule(plan: Reminder[], stillToday: string[]): Promise<void>;
};

const PlatformContext = createContext<Platform>({});

/** The platform the app runs on, for the screens. */
export const PlatformProvider = PlatformContext.Provider;

/** What the app takes from the platform it runs on (`Platform`). */
export const usePlatform = () => useContext(PlatformContext);
