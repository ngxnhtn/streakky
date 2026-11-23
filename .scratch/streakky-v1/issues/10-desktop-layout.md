# 10: Desktop layout

**What to build:** On a wide screen the web app shows the desktop layout from the design playground: my habits alongside the selected habit's detail. On a narrow screen, including the web app on a phone, it shows the phone layout. The same build switches layout from the screen width, live as the window is resized.

**Spec:** Streakky v1 spec, user stories 64–66, and section "Web layouts and PWA".

**Blocked by:** 04 (Habit detail)

**Status:** ready-for-agent

- [ ] Wide screens get the desktop layout, built from the playground's design, and narrow screens get the phone layout.
- [ ] Resizing across the breakpoint switches layout without losing the selected habit or any unsaved input.
- [ ] Every screen that exists so far is reachable in both layouts.
- [ ] `vp check` and `vp test` pass.
