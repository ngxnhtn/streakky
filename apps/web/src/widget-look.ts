import { HABIT_COLORS, type ColorId, type PaletteId, type Settings } from "@streakky/core";
import { habitTileTint } from "@streakky/ui/components/habit/habit-card";

/**
 * The widget's colours in light or dark, each "#rrggbb": the page's ground, which its habit chooser
 * takes, its name, its label, and each habit colour's.
 */
export type WidgetColors = {
  ground: string;
  name: string;
  label: string;
  habits: Record<ColorId, { count: string; tile: string }>;
};

/**
 * How the home-screen widget looks: the palette's colours in light and in dark, as the app's habit
 * card has them, and the theme, which picks between them as it does for the app.
 */
export type WidgetLook = { theme: Settings["theme"]; light: WidgetColors; dark: WidgetColors };

// a palette's colours don't change while the app runs
const measured = new Map<PaletteId, Pick<WidgetLook, "light" | "dark">>();

/**
 * The widget's look for a palette and theme, measured from the app's own stylesheet: each colour
 * is read off a habit card's parts drawn in a hidden frame, which keeps the page's own dark mode
 * from reaching the light colours.
 */
export function widgetLook({ palette, theme }: Pick<Settings, "palette" | "theme">): WidgetLook {
  let colors = measured.get(palette);
  if (!colors) {
    colors = measureIn(palette);
    measured.set(palette, colors);
  }
  return { theme, ...colors };
}

function measureIn(palette: PaletteId): Pick<WidgetLook, "light" | "dark"> {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:0;visibility:hidden";
  document.body.append(frame);
  try {
    const doc = frame.contentDocument;
    if (!doc) throw new Error("The widget's colours couldn't be measured: no frame to draw in");
    const style = doc.createElement("style");
    style.textContent = appStylesheet();
    doc.head.append(style);
    return { light: colorsIn(doc, palette, false), dark: colorsIn(doc, palette, true) };
  } finally {
    frame.remove();
  }
}

/** The page's stylesheets as one text, for the frame. */
function appStylesheet(): string {
  return [...document.styleSheets]
    .flatMap((sheet) => {
      try {
        return [...sheet.cssRules].map((rule) => rule.cssText);
      } catch {
        // another origin's sheet can't be read; the app's own are all from its origin
        return [];
      }
    })
    .join("\n");
}

/** A habit card's parts in the palette, light or dark, and the colours they're drawn in. */
function colorsIn(doc: Document, palette: PaletteId, dark: boolean): WidgetColors {
  const element = (className: string, parent: Element) => {
    const child = doc.createElement("div");
    child.className = className;
    parent.append(child);
    return child;
  };
  const mode = element(dark ? "dark" : "", doc.body);
  const page = element("bg-background text-foreground", mode);
  page.dataset.palette = palette;
  const label = element("text-muted-foreground", page);
  const parts = HABIT_COLORS.map(({ id }) => {
    const tile = element(habitTileTint, page);
    tile.dataset.habitColor = id;
    return { id, tile, count: element("text-habit", tile) };
  });
  const view = doc.defaultView;
  if (!view) throw new Error("The widget's colours couldn't be measured: the frame has no window");
  const styleOf = (part: Element) => view.getComputedStyle(part);
  const ground = styleOf(page).backgroundColor;
  const colors: WidgetColors = {
    ground: flatten(ground),
    name: flatten(ground, styleOf(page).color),
    label: flatten(ground, styleOf(label).color),
    habits: Object.fromEntries(
      parts.map(({ id, tile, count }) => {
        const tileColor = styleOf(tile).backgroundColor;
        return [
          id,
          {
            count: flatten(ground, tileColor, styleOf(count).color),
            tile: flatten(ground, tileColor),
          },
        ];
      }),
    ) as WidgetColors["habits"],
  };
  mode.remove();
  return colors;
}

/**
 * Colours laid one over the other, as the screen draws them, flattened to one "#rrggbb": a
 * habit's faint tile over the ground, say.
 */
function flatten(...layers: string[]): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("The widget's colours couldn't be measured: no canvas");
  for (const color of layers) {
    // a colour the canvas can't read leaves the last one in place, so check it took
    const unset = "#010203";
    context.fillStyle = unset;
    context.fillStyle = color;
    if (context.fillStyle === unset) throw new Error(`The widget can't use the colour ${color}`);
    context.fillRect(0, 0, 1, 1);
  }
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
