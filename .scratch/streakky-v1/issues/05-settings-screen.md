# 05: Settings screen

**What to build:** A Settings screen where I choose:

- light, dark or system theme;
- the app's colour palette;
- grid or list layout for Home;
- whether weeks start on Monday or Sunday.

Settings belong to this device. They're stored separately from habit data, survive a reload and are never synced. Later tickets add their own sections to this screen: celebrations (06), export (09), account (13) and the reminder (19).

**Spec:** Streakky v1 spec, user stories 57–61, and section "Habit store" (device settings).

**Blocked by:** 02 (Web app tracer: build habits saved on the device)

**Status:** ready-for-agent

- [ ] Settings is reachable from Home, and back returns to Home.
- [ ] Theme (light, dark or system) applies immediately, and "system" follows the operating system's appearance.
- [ ] Choosing one of the five palettes recolours the app immediately.
- [ ] The layout setting switches Home between grid and list. List rows keep the one-tap check-in that grid cards got in 02 (the tick is its own 44px button).
- [ ] Week start (Monday or Sunday) is used by every calendar.
- [ ] Settings live in device-local storage outside the habit store's synced data, and survive a reload.
- [ ] `vp check` and `vp test` pass.
