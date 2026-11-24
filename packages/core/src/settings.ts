/** Device settings: they belong to one device and never sync. */

export type Theme = "system" | "light" | "dark";

/** Light or dark, or following the device. */
export const THEMES: { id: Theme; name: string }[] = [
  { id: "system", name: "System" },
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
];

export type Layout = "grid" | "list";

/** How Home shows the habits. */
export const LAYOUTS: { id: Layout; name: string }[] = [
  { id: "grid", name: "Grid" },
  { id: "list", name: "List" },
];

/** 0: weeks start on Sunday. 1: on Monday. */
export type WeekStart = 0 | 1;

/** The days a week can start on, in the calendars. */
export const WEEK_STARTS: { id: WeekStart; name: string }[] = [
  { id: 1, name: "Monday" },
  { id: 0, name: "Sunday" },
];

export type PaletteId = "teal" | "cobalt" | "olive" | "oxblood" | "graphite";

/** App colour themes. Their colours live in @streakky/ui (globals.css, `data-palette`). */
export const PALETTES: { id: PaletteId; name: string }[] = [
  { id: "teal", name: "Teal" },
  { id: "cobalt", name: "Cobalt" },
  { id: "olive", name: "Olive" },
  { id: "oxblood", name: "Oxblood" },
  { id: "graphite", name: "Graphite" },
];

export type Settings = {
  theme: Theme;
  palette: PaletteId;
  layout: Layout;
  weekStart: WeekStart;
  /**
   * The Android app's daily reminder: on only once notifications are allowed (ticket 19). Named
   * apart from the playground's old `reminder`, which devices kept as on by default.
   */
  dailyReminder: boolean;
  /** When the daily reminder fires, HH:MM (`isReminderTime`). */
  reminderTime: string;
  celebrate: boolean;
  /** The web app's note that signed-out habits live only in this browser, once dismissed. */
  signedOutNoteDismissed: boolean;
  /** Home's hint that habits can be dragged into order, once dismissed or after a first reorder. */
  reorderHintDismissed: boolean;
};

export const defaultSettings: Settings = {
  theme: "system",
  palette: "teal",
  layout: "grid",
  weekStart: 1,
  dailyReminder: false,
  reminderTime: "21:00",
  celebrate: true,
  signedOutNoteDismissed: false,
  reorderHintDismissed: false,
};

/** Whether `value` is a time of day the reminder can be set to: HH:MM, 24-hour. */
export const isReminderTime = (value: unknown): value is string =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
