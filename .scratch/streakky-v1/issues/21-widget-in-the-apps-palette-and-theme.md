# 21: Widget in the app's palette and theme

**What to build:** The home-screen widget looks the way the app does on my phone. It uses the palette I picked in Settings (teal, cobalt, olive, oxblood or graphite), and my theme: light or dark keeps it so whatever the phone's mode, and "system" follows the phone's light or dark mode as it changes. Changing either setting in the app redraws the widgets.

Today the widget always uses the teal palette and the phone's mode (ticket 20's limits).

**Spec:** Streakky v1 spec, user story 89, and section "Android" (Widget, Looks).

**Blocked by:** 20 (Home-screen widget)

**Status:** ready-for-agent

- [ ] The app writes its palette and theme with the widget summaries, and writes again when either changes in Settings.
- [ ] Each habit colour's count and tile colours match the app's habit card in every palette, light and dark. They come from the same source as the app's, not copied by hand.
- [ ] A theme of light or dark keeps the widget so whatever the phone's mode; "system" follows the phone's mode as it changes, without the app.
- [ ] The full layout, the small layout, the preview and "Choose a habit" all use the chosen colours.
- [ ] Verified on the owner's phone: at least two palettes, and each theme with the phone in light and in dark mode.
- [ ] `vp check` and `vp test` pass, and `vp run web#android-test`.
