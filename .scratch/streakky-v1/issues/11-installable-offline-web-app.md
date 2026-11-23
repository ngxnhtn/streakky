# 11: Installable offline web app

**What to build:** I can install Streakky from my browser, and after the first visit it opens with no network at all. The app also asks the browser to keep its storage, so my habits are less likely to be deleted. A new deploy is picked up on the next open.

**Spec:** Streakky v1 spec, user stories 38, 40–41, and section "Web layouts and PWA".

**Blocked by:** 02 (Web app tracer: build habits saved on the device)

**Status:** ready-for-agent

- [ ] The web app has a manifest and icons, and Chrome offers to install it.
- [ ] After one online visit, the app opens and works with the network off, served from the app shell cached by its service worker.
- [ ] After a new build is deployed, the app runs the new version within one reopen.
- [ ] On load the app requests persistent storage, and it works normally if the browser declines.
- [ ] `vp check` and `vp test` pass, and the production build includes the service worker.
