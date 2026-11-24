# 21: Widget in the app's palette and theme

**What to build:** The home-screen widget looks the way the app does on my phone. It uses the palette I picked in Settings (teal, cobalt, olive, oxblood or graphite), and my theme: light or dark keeps it so whatever the phone's mode, and "system" follows the phone's light or dark mode as it changes. Changing either setting in the app redraws the widgets.

Today the widget always uses the teal palette and the phone's mode (ticket 20's limits).

**Spec:** Streakky v1 spec, user story 89, and section "Android" (Widget, Looks).

**Blocked by:** 20 (Home-screen widget)

**Status:** done

- [x] The app writes its palette and theme with the widget summaries, and writes again when either changes in Settings.
- [x] Each habit colour's count and tile colours match the app's habit card in every palette, light and dark. They come from the same source as the app's, not copied by hand.
- [x] A theme of light or dark keeps the widget so whatever the phone's mode; "system" follows the phone's mode as it changes, without the app.
- [x] The full layout, the small layout, the preview and "Choose a habit" all use the chosen colours.
- [x] Verified on the owner's phone: at least two palettes, and each theme with the phone in light and in dark mode.
- [x] `vp check` and `vp test` pass, and `vp run web#android-test`.

## Comments

**Done (2026-11-25).**

- **Where the colours come from:**
  - The app measures them from its own stylesheet (`widgetLook` in apps/web/src/widget-look.ts). In a hidden frame given the page's styles, it lays out a habit card's parts for the palette, once in light and once under `dark`:
    - the page's ground and text;
    - the muted label;
    - each habit colour's tint and count.
  - It flattens each colour on a canvas, so a tile is its faint tint over the ground as the screen draws it.
  - The frame keeps the page's own dark mode from reaching the light colours.
  - The tint is the card's own classes, now exported from the design system as `habitTileTint`.
  - The measured teal colours matched those computed for ticket 20: the text colours exactly, the tiles within 1 in a channel (rounding).
- **When they're written:** with the summaries, a moment after any change, as the app opens, and when the palette or theme changes.
  - If measuring fails, the summaries are written still and the widgets keep their last colours; the failure is logged.
- **Drawing:**
  - The widget paints its tile, name, count and label from the look.
  - On Android 12 and later, with `setColorInt`, it gets the colours for the phone in light and in dark: the theme's own twice for light or dark, or both for system, so it follows the phone's mode as it changes.
  - Before Android 12, it uses the colours showing when it's drawn.
- **"Choose a habit"** takes the theme (AppCompat's local night mode) and the palette's ground and ink, with each habit's dot in its colour.
- **The widget list's preview:** on Android 15 and later, the app publishes it in its look when the look changes (`setWidgetPreview`). A refused one is tried again at the app's next write.
- **What's still copied by hand:** the default teal look in the colour resources. It's what the widget list's static preview and a widget before the app has ever written use, both before any measuring can happen. The other palettes' and habit colours' copies are gone.
- **Checked on the owner's Pixel 8** (Android 17, Lawnchair), the widget's tile pixel against the colour the app wrote, all the same:
  - olive, system: phone dark, then the phone switched to light without the app;
  - olive, dark with the phone light; olive, light with the phone dark;
  - oxblood, system: phone dark, then light without the app;
  - oxblood, light: phone dark and phone light; oxblood, dark with the phone dark.
  - The name, count and label looked right in each.
  - "Choose a habit" was dark for system with the phone dark. For oxblood, light with the phone dark, it was light, with oxblood's ground (#e2e2e2) and ink. A first try left the dialog white: AppCompat colours it by a colour filter, which outranks a tint, so the app now sets a filter.
  - Afterwards the owner's olive palette, system theme and dark mode were put back, and the test habit and widgets removed.
- **Review:**
  - The theme is a Kotlin enum with one switch, and painting belongs to the look.
  - Default looks and parsing are in one place.
  - The tint is exported as `habitTileTint` and listed in the UI package's README.
  - The chooser got the palette's ground and ink.
  - A failed measurement no longer stops the counts.
- **Limits:**
  - **Before Android 12** a system widget changes mode only when it's next drawn: the app's next write, midnight or a clock change.
  - **The preview:** Lawnchair kept showing the static teal one, though Android took the published preview. It's only published on Android 15 and later.
  - **Right after updating from ticket 20's build:** before the app next opens, red, blue, ochre and rose habits' widgets show teal, since there's no look yet. Only the owner's phone had that build.
  - **Small layout:** not checked separately; it's painted by the same code as the full one.
