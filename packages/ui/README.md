# @streakky/ui

Streakky's design system: tokens, colour themes, shadcn components (Radix, `radix-nova` style,
restyled) and Streakky's own components. Tailwind CSS v4. The habit model it draws lives in
[`@streakky/core`](../core) (no React).

## Use it in an app

```jsonc
// package.json
"dependencies": { "@streakky/ui": "workspace:*", "@streakky/core": "workspace:*" }
```

```css
/* the app's stylesheet, in place of @import "tailwindcss" */
@import "@streakky/ui/globals.css";
```

Load the two faces in the app's HTML head:

```html
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wdth,wght@75..100,400..700&family=DM+Mono:wght@400;500&display=swap"
/>
```

The app needs Tailwind's Vite plugin (`@tailwindcss/vite`). The design system's own source is
scanned from `globals.css`, so its classes are always built.

```tsx
import { Button } from "@streakky/ui/components/button";
import { StreakRing } from "@streakky/ui/components/habit/ring";
import { cn } from "@streakky/ui/lib/utils";
```

## Theming: three switches

Each is an attribute or class on any element and cascades to its subtree.

| Switch                               | Values                                          | Default |
| ------------------------------------ | ----------------------------------------------- | ------- |
| `data-palette` (usually on `<html>`) | `teal` `cobalt` `olive` `oxblood` `graphite`    | `teal`  |
| `class="dark"`                       | dark mode: the palette's ink becomes the ground | light   |
| `data-habit-color` (a habit's scope) | `teal` `red` `blue` `ochre` `rose` `green`      | the ink |

Tokens follow shadcn's names (`bg-background`, `text-foreground`, `bg-muted`,
`text-muted-foreground`, `bg-primary`, `border-border`, `ring-ring`, `bg-destructive` …) plus:

- `bg-habit` / `text-habit` / `text-habit-foreground`: the nearest habit colour
  (`bg-habit/9` is a card tint)
- `bg-primary-hover`, `bg-press`, `bg-scrim`
- `font-display`, `font-mono`; eases `ease-ui`, `ease-enter`
- `hover-fine:`: hover on a fine pointer only (no sticky hover on touch)
- focus rings: `outline-hidden focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring`.
  `outline-hidden` (like `outline-none`) sets the outline style to none, so a focus ring must set
  `outline-solid` itself or it never shows
- animations: `animate-push-in(-left)`, `animate-push-out(-left)`, `animate-sheet-in/out`,
  `animate-dialog-in/out`, `animate-fade-in/out`, `animate-rise`, `animate-tick-pop`

Every palette holds 4.5:1 or more for muted text on surfaces and 8:1 or more for ink on the
ground, in both modes; every habit colour holds 4.6:1 or more on every ground.

## Units

Everything is sized in rem (Tailwind's scale, or arbitrary values such as `text-[0.8125rem]`), so the
whole interface grows with the reader's browser text size. Only hairlines of 2px or less (borders,
outlines, inset ring strokes, the 1px hover and press steps) stay in px. Tap targets are at least
2.75rem (`size-11`), which is 44px at the default size.

## Components

`@streakky/ui/components/…`

| Component        | What it is                                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `button`         | Pill buttons: `default` `secondary` `outline` `ghost` `ring` `destructive` `outline-destructive` `habit` `link`; sizes `default` `sm` `lg` `icon` `icon-sm` |
| `dialog`         | Radix dialog in two shapes: `shape="sheet"` (bottom sheet) or `"center"`; `DialogActions`                                                                   |
| `portal`         | `PortalContainerProvider`: render dialogs inside a given element (a phone frame, a panel)                                                                   |
| `tabs`           | Radix tabs drawn as a segmented track with a sliding pill (`TabsList index count`)                                                                          |
| `segmented`      | A single choice of two to four options, sliding pill; options may be icons                                                                                  |
| `toggle-group`   | `ToggleGroup` + `ToggleChip` (pill chips) + `ToggleGroupItem` (custom faces)                                                                                |
| `switch`         | Radix switch                                                                                                                                                |
| `input`, `label` | Text fields                                                                                                                                                 |
| `field`          | `Field` (label, control, hint, error, wired ids) and `FieldSet`                                                                                             |
| `list`           | `ListGroup` `List` `ListItem` `ListButton` `ListLabel`: grouped settings rows                                                                               |
| `card`           | `Card`, `CardTitle`: outlined panels for wide layouts                                                                                                       |
| `stat`           | `StatGrid`, `StatTile`                                                                                                                                      |
| `app-bar`        | A phone screen's top bar                                                                                                                                    |
| `palette-picker` | The app colour themes as swatches                                                                                                                           |

`@streakky/ui/components/habit/…`: presentational; they take a `Habit` from
`@streakky/core` and callbacks, and keep no app state.

| Component       | What it is                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ring`          | `StreakRing`: the 270° gauge with the count; arc and number ease up together                                                                         |
| `today-button`  | `TodayButton`: check in today (build) or log a slip (quit)                                                                                           |
| `habit-card`    | `HabitCard` (grid), `HabitRow` (list), `CheckInTick`, `CheckInButton`, `SlipIcon`, `SlipButton` (2.75rem toggles), `NewHabitTile`, `HabitCollection` |
| `calendar`      | `HabitCalendar`: Weeks and Month views, edit days                                                                                                    |
| `streaks-chart` | `StreaksChart`: every streak as a bar, with a readout and a hidden table                                                                             |
| `stats`         | `HabitStats`: four tiles and the streaks chart                                                                                                       |
| `goal`          | `HabitGoal`: distance to the goal, progress, goal chips                                                                                              |
| `color-picker`  | `HabitColorPicker`                                                                                                                                   |

Hooks: `@streakky/ui/hooks/use-tween` (`useTween`, `prefersReducedMotion`).

## Add a shadcn component

```bash
cd packages/ui
pnpm dlx shadcn@latest add <name>
```

Then restyle it to the tokens above. If the CLI writes `import { cn } from "cn"`, point it at
`@streakky/ui/lib/utils` and remove the `cn` package it installs.

## Motion

Hover steps up 1px on a fine pointer, a press sinks 1px and scales .985 (150ms in, 120ms out,
90ms press). Screens push in 340ms, sheets rise 380ms, dialogs settle 280ms. Under reduced
motion everything rests.
