/** Device settings: they belong to one device and never sync. */

export type Theme = "system" | "light" | "dark";

export type Layout = "grid" | "list";

/** 0: weeks start on Sunday. 1: on Monday. */
export type WeekStart = 0 | 1;

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
  reminder: boolean;
  reminderTime: string;
  celebrate: boolean;
};

export const defaultSettings: Settings = {
  theme: "system",
  palette: "teal",
  layout: "grid",
  weekStart: 1,
  reminder: true,
  reminderTime: "21:00",
  celebrate: true,
};
