# Streakky v1: local-first habit tracker on web and Android

Status: ready-for-agent

## Problem Statement

I want to track the habits I'm building and the habits I'm quitting, and see my streaks grow every day, on my laptop and on my Android phone. Today Streakky is only a design prototype: its data lives in one browser tab, it doesn't sync, and there is no Android app. Most habit apps want an account up front, put my data on someone else's servers, or stop working without a connection. I want an app that works fully offline and without signing in, keeps the same habits on all my devices once I do sign in, runs on my own Cloudflare account, and puts a habit's streak on my phone's home screen.

## Solution

Streakky v1 is a local-first habit tracker with two kinds of habit:

- **Build habits:** a daily check-in, where missing a day ends the streak.
- **Quit habits:** every day after the quit day is clean unless a slip is logged.

It ships as:

- **A web app:** installable and works offline. It shows the phone layout on narrow screens and the desktop layout on wide ones.
- **An Android app:** the same build wrapped in Capacitor, installed from GitHub Releases through Obtainium.
- **An API:** one Cloudflare Worker at `hb.nhutien.com` that serves the web app and the API, with D1 as the system of record.

Everything works signed-out, with data kept on the device. Signing in with a one-time email code (allowlisted addresses only) syncs a person's habits across their devices, and edits made offline on several devices merge predictably. On Android, a daily reminder nudges when a build habit still needs today's check-in, and a home-screen widget shows one habit's current streak.

The domain vocabulary is defined in `GLOSSARY.md`. This spec follows ADR-0001 (Android is the web build in Capacitor), ADR-0002 (sync with TanStack DB over our own D1 endpoints, including the merge rules) and ADR-0003 (a personal, self-hosted app).

## User Stories

### Habits

1. As a user, I want to create a build habit with a name and colour, so that I can start tracking something I want to do every day.
2. As a user, I want to create a quit habit with a name, colour and quit day, so that I can count my clean days since I stopped.
3. As a user, I want to set a quit day in the past when creating a quit habit, so that a habit I quit weeks ago shows its real streak from day one.
4. As a user, I want to optionally give a habit a goal of 7, 14, 21, 30, 60, 90, 180 or 365 days, so that I have a target for my current streak.
5. As a user, I want to rename a habit, so that I can fix typos or reword it.
6. As a user, I want to change a habit's colour, so that I can tell my habits apart at a glance.
7. As a user, I want to change or remove a habit's goal at any time, so that I can raise the bar once I reach it.
8. As a user, I want to move a quit habit's quit day to another past day, so that I can correct when I actually quit.
9. As a user, I want a warning before moving the quit day past existing slips, which says those slips will be removed, so that I don't lose history by accident.
10. As a user, I want a habit's kind to stay fixed, so that my check-ins never silently turn into slips. To change the kind, I delete the habit and create a new one.
11. As a user, I want to archive a habit I no longer track, so that it leaves my everyday views but keeps its history.
12. As a user, I want to see my archived habits and restore one, so that I can pick a habit back up with its history intact.
13. As a user, I want to delete a habit permanently, after a confirmation, so that I can remove habits I created by mistake.
14. As a user, I want to drag my habits into my own order, so that the ones I care about most come first.
15. As a user, I want my habit order to be the same on all my signed-in devices, so that every device feels like the same app.

### Check-ins and slips

16. As a user, I want to check in a build habit for today with one tap, so that logging takes no effort.
17. As a user, I want to undo today's check-in, so that I can fix a mis-tap.
18. As a user, I want to add or remove a check-in on any past day, so that I can fix my history when I forgot to log.
19. As a user, I want to log a slip on a quit habit for today, so that my count stays honest.
20. As a user, I want to add or remove a slip on any past day after the quit day, so that I can correct my quit history.
21. As a user, I want future days to be locked, so that I can't log a day that hasn't happened.
22. As a user, I want a habit to have at most one check-in or slip per day, so that each day is simply done or not done (clean or slipped for quit habits).
23. As a user, I want days to follow my device's local calendar and change at midnight, so that "today" always means my today, even when I travel.

### Streaks and goals

24. As a user, I want to see each habit's current streak on the home screen, so that I know where I stand today.
25. As a user, I want a build habit's current streak to survive through today before I've checked in, so that it doesn't look broken in the morning.
26. As a user, I want a build habit with no check-in yesterday or today to show a current streak of 0 with a prompt to check in today, so that I know the streak has ended.
27. As a user, I want a quit habit's current streak to grow by one each day without a slip, so that I see my clean days add up without doing anything.
28. As a user, I want a slip to end the current streak and start a new one from the next day, so that the count reflects my latest clean days.
29. As a user, I want quit habits to read "N days free" and build habits to read "N day streak", so that the number means the right thing for each kind.
30. As a user, I want to see when my current streak began, so that I know how long I've kept it up.
31. As a user, I want to see a habit's longest streak, so that I know my record to beat.
32. As a user, I want a calendar of a habit's history with each streak's days highlighted, so that I can see my patterns.
33. As a user, I want a chart of all a habit's streaks, with the longest and the current one labelled, so that I can see how my streaks have changed over time.
34. As a user, I want to see the day my goal will be reached (or was reached) on the current streak, so that I have something concrete to aim for.
35. As a user, I want a celebration when my current streak reaches its goal, so that I feel rewarded. I can turn this off in Settings.
36. As a user, I want my goal to carry over to the next streak after a break, so that I can try again without setting it up again.

### Local-first and signed-out use

37. As a user, I want to use every feature except sync without an account, so that I can start tracking immediately.
38. As a user, I want the app to open and work with no network, so that I can check in anywhere.
39. As a user, I want my changes saved on the device as soon as I make them, so that closing the app never loses a check-in.
40. As a web user, I want to install Streakky as an app from my browser, so that it opens like a native app and works offline after the first visit.
41. As a web user, I want the app to ask my browser to keep its data, so that my browser is less likely to delete my habits.
42. As a signed-out web user, I want one small note I can dismiss, saying my habits live only in this browser and that signing in backs them up, so that I understand the risk without being forced to sign in.

### Accounts and sync

43. As a user, I want to sign in by typing my email and then a 6-digit code I receive, so that I never manage a password.
44. As the owner, I want only allowlisted email addresses to be able to sign in, so that strangers can't use my server or my email quota.
45. As a user whose email isn't on the allowlist, I want to be told the address can't sign in, with no code sent, so that I know what happened.
46. As a user, I want my habits, check-ins, slips, habit order and archive state to sync between my signed-in devices, so that my phone and my laptop show the same thing.
47. As a user, I want edits I make offline to sync automatically when I'm back online, so that I never think about syncing.
48. As a user, I want changes from my other devices to show up when I open the app or bring it back to the foreground, so that I see the latest state.
49. As a user, when I change the same day on two devices while offline, I want the later edit to win, so that the result matches what I did last.
50. As a user, when I edit the same habit's fields on two devices offline, I want each field to keep its latest edit, so that a rename on one device and a colour change on the other both survive.
51. As a user, when I delete a habit on one device and edit it on another, I want it to stay deleted, so that deleted habits never come back.
52. As a user, when I sign in on a device that already has signed-out habits, I want all of them merged into my account, even ones with the same name as existing habits, so that nothing is ever lost. I can delete duplicates myself.
53. As a user, I want signing out to clear all my habits from this device and return it to an empty signed-out app, so that the next person to sign in there doesn't get my data.
54. As a user, I want a warning before signing out if some changes haven't synced yet, so that I don't lose them.
55. As a user, I want my device settings to stay when I sign out, so that my theme and reminder don't reset.
56. As a user, I want to stay signed in on my phone and laptop until I sign out, so that I don't keep entering codes.

### Settings and export

57. As a user, I want to choose light, dark or system theme, so that the app suits my surroundings.
58. As a user, I want to pick a colour palette for the app, so that it feels like mine.
59. As a user, I want to switch the home screen between grid and list layout, so that I can see my habits the way I like.
60. As a user, I want to choose whether weeks start on Monday or Sunday, so that the calendars match how I think.
61. As a user, I want settings to stay on each device and not sync, so that my phone and laptop can each be set up differently.
62. As a user, I want to export my full history, every habit (archived ones included) with every check-in and slip, as one file, so that I have my own backup.
63. As an Android user, I want the export to open the share sheet, so that I can save it to Files or send it somewhere.

### Layouts

64. As a user on a phone-sized screen, I want the phone layout with Home, Habit detail and Settings screens, so that it fits one hand.
65. As a user on a wide screen, I want the desktop layout, so that I can see more at once.
66. As a user, I want the same build to choose its layout from the screen width, so that the web app on my phone looks like the Android app.

### Android

67. As an Android user, I want to install and update Streakky through Obtainium from the project's GitHub Releases, so that I get new versions without the Play Store.
68. As an Android user, I want my data stored in the app's own storage on the phone, so that the system won't delete it like browser data.
69. As an Android user, I want sign-in to keep working in the app, so that sync works on my phone as it does on the web.
70. As an Android user, I want to turn on one daily reminder at a time I choose, 21:00 by default, so that I remember to check in.
71. As an Android user, I want the reminder to fire only when at least one active build habit has no check-in yet that day, so that it never nags me when I'm done or when I only have quit habits.
72. As an Android user, I want the reminder to name the build habits still waiting for today's check-in, so that I know what's left.
73. As an Android user, I want the app to ask for notification permission when I turn the reminder on, so that I understand why it's asking.
74. As an Android user, I want to place a home-screen widget and pick which habit it shows, so that I can see that streak without opening the app.
75. As an Android user, I want several widgets for several habits, so that I can keep my most important streaks on my home screen.
76. As an Android user, I want the widget to show the habit's name, its current streak and the right label, in the habit's colour, so that it reads like the app.
77. As an Android user, I want the widget's number to stay right after midnight even if I haven't opened the app, so that it never shows yesterday's count.
78. As an Android user, I want the widget to update right after I check in or log a slip in the app, so that both always agree.
79. As an Android user, I want tapping the widget to open that habit in the app, so that I can act on it quickly.
80. As an Android user, I want a widget whose habit was archived or deleted to say so, and open the app when tapped, so that it doesn't show stale data.
81. As an Android user, I want to resize the widget, so that it fits my home screen layout.

### Owner and operations

82. As the owner, I want the web app and the API served by one Worker at `hb.nhutien.com`, so that there is one thing to deploy and web sign-in cookies stay first-party.
83. As the owner, I want to deploy the Worker, web app and database migrations with one command from my Mac, so that releasing is quick.
84. As the owner, I want pushing a version tag to build, sign and publish the Android APK to a GitHub Release, so that I don't need the Android SDK just to ship.
85. As the owner, I want everything to run within Cloudflare's free tiers and Resend's free tier, so that Streakky costs me nothing to run.
86. As the owner, I want sign-in codes sent from `hb@nhutien.com`, so that the emails come from my own domain.
87. As the owner, I want sign-in attempts rate-limited by client IP, so that the email codes can't be brute-forced.
88. As the owner, I want the design playground to keep building against the renamed domain model, so that I can keep tinkering with designs.

## Implementation Decisions

### Modules

- **Core package (domain model, no UI):**
  - Rename to the glossary vocabulary:
    - the tracked `Streak` becomes **Habit**;
    - `Mode` becomes **Kind**;
    - `Run` becomes **Streak**;
    - `marks` splits by meaning into **check-ins** (build) and **slips** (quit);
    - `start` becomes **quit day**, which only quit habits have.
  - The streak functions follow the new names: all streaks of a habit, its current streak, current-streak length, longest streak, the goal date, which days are editable, day highlighting for calendars, and the counter and "since" labels.
  - New rules:
    - Build habits have no start date; their history starts at the first check-in.
    - Check-ins can be added or removed on any past day.
    - Slips can only be logged after the quit day, and slips on or before the quit day are ignored when counting.
    - Moving the quit day reports which slips it would remove.
    - A habit has archived state and an order position.
    - A quit habit stops counting while it's archived: its archived days, from the day after archiving to the day before restoring, are neither clean days nor slips, and don't end its streak. Build habits count as before.
  - Core also owns two small functions shared with the Android widget: building a habit's **widget summary**, and computing the current-streak number from a summary plus a given today.
  - The date helpers keep working on local `YYYY-MM-DD` dates with no time zone.
- **UI package (design system only):**
  - It keeps tokens, colour palettes, shadcn components and the Streakky building blocks: ring, calendar, habit card, streaks chart, stats, goal, colour picker, today button.
  - Components move to the new core names. "Longest run" becomes "Longest streak", and the runs chart becomes a streaks chart.
  - It has no screens and no dependency on sync, storage or auth.
- **Design playground (demo app):** stays a design playground with its own screens and in-memory sample store. It's migrated mechanically to the renamed core and UI APIs so it keeps building, and it isn't wired to sync or auth.
- **Web app:**
  - It replaces the TanStack Start starter with a plain Vite single-page app with no server rendering and no landing page. It opens straight into the app.
  - It owns the real screens: Home, Habit detail, New habit, Edit habit, Archived habits, Settings and Sign-in. Their designs come from the playground's phone and desktop layouts, built with the UI package.
  - It owns the **habit store**, the interface the screens call (see below).
  - It also owns the PWA manifest and the service worker that caches the app shell, and the Capacitor project.
- **API Worker:** a new Cloudflare Worker app, routed with Hono. It serves the web app's static build, with a fallback to the single-page app for unknown paths, plus `/api/auth/*` (better-auth) and `/api/sync/*` (push and pull). It's bound to one D1 database and attached to the custom domain `hb.nhutien.com`, whose zone is already on Cloudflare.
- **Android widget (native):** Kotlin code in the Capacitor Android project, plus a small custom Capacitor plugin that the web app calls to write widget summaries and refresh widgets.

### Habit store (the interface the screens use)

- **Commands:** create a habit, edit name, colour or goal, move the quit day, archive, restore, delete, reorder, toggle a day (a check-in or a slip, depending on kind), sign in (request a code, verify a code), sign out, and export.
- **Live queries:** active habits in order, archived habits, one habit with its derived streak data, sync status (signed in or out, pending changes, last synced) and device settings.
- It's built on TanStack DB collections for habits and days, with optimistic local writes and an offline queue of pending pushes.
- **Persistence:** SQLite on the device. In the browser that's TanStack DB's OPFS wa-sqlite persistence; on Android it's native SQLite through a Capacitor SQLite plugin.
- **Device settings** (theme, palette, layout, week start, reminder on/off and time, celebrations, whether the signed-out note was dismissed) live in device-local key-value storage. They're never synced and they survive sign-out.

### Synced data shape

This is adapted from the prototype's `Streak` type, with the decision-rich fields only:

```ts
type Habit = {
  id: string; // generated on the device
  kind: "build" | "quit"; // fixed at creation
  name: string;
  color: ColorId;
  goal: number | null;
  quitDay: string | null; // YYYY-MM-DD, quit habits only
  archived: boolean;
  // every time it was archived, oldest first; YYYY-MM-DD, restoredOn null while it still is
  archivedPeriods: { archivedOn: string; restoredOn: string | null }[];
  order: string; // fractional position, so a reorder changes only one habit
  deleted: boolean; // tombstone: once true, never false again
  edited: Record<EditableField, number>; // device edit time of each field's last change
  changeIds: Record<EditableField, string>; // id of each field's last change, for ties in edit time
};

type DayRecord = {
  habitId: string;
  day: string; // YYYY-MM-DD; with habitId, the record's identity
  logged: boolean; // true = check-in (build) or slip (quit); false = removed
  edited: number; // device edit time
  changeId: string; // id of the last change, for ties in edit time
};
```

- Removing a check-in or slip writes `logged: false` rather than deleting the record, so "the later edit wins" works per habit and day.
- **Edit times and change ids:** each change takes the device's time, or one millisecond after the time it replaces if the clock reads earlier, so a later edit on one device always beats its own earlier one. Every change gets a fresh change id; fields changed together share one time and one id. Records kept from before sync have no change ids and send `""`, the lowest.
- **Pending:** the device marks each record it changes as waiting for a push, a device-local flag that never syncs. Records kept from before sync count as waiting, so signing in pushes them.
- **Archived periods:**
  - Archiving opens a period on the device's today, and restoring closes the open one on its today. Both write `archived` and `archivedPeriods` together, with one edit time, so a merge always takes the two from the same device's edit (ADR-0002).
  - A quit habit's archived days are the days strictly between `archivedOn` and `restoredOn` (through today while still archived), after its quit day. They're neither clean days nor slips, and slips on them are ignored when counting. Build habits keep periods too, but count nothing from them.
  - Every period is kept, including ones with no archived days (restored the same day or the next).
  - Habits stored before the field came (before sync was built) have neither `archivedPeriods` nor `edited.archivedPeriods`. Read them as `[]` and as `edited.archived`. The device's stored collection keeps `schemaVersion: 1`: changing it would reset the collection, wiping stored habits, or refuse to open it.
- On the server, each row also carries the owning account and a per-account server version number, which drives incremental pulls.

### Sync API (Worker)

- **Push:** an authenticated device sends a batch of changed habits and day records, each with a change id.
  - Pushes are idempotent, so resending a batch is harmless.
  - For habits, the server applies "later edit wins" field by field, by edit time. For day records, it applies it per habit and day.
  - A deleted habit stays deleted, and any of its day records still arriving are kept but ignored.
  - Ties in edit time are broken deterministically by change id.
  - Each row that changes gets the account's next server version.
- **Pull:** an authenticated device asks for every row changed since its last-seen server version. It gets the rows (deleted habits included) and a new version to remember.
- **When a device syncs:** on app start, on regaining connectivity, on returning to the foreground, shortly after local changes (debounced), and periodically while open.
- **First sign-in on a device:** every local habit and day record is pushed as it is, then the device pulls. There's no matching by name.
- **Sign-out:** if the pending-push queue isn't empty, the app warns first. It then wipes the habit and day collections and the stored credentials, but keeps device settings.

### Auth

- better-auth runs in the Worker on the D1 binding through its Drizzle adapter.
- It uses two plugins: **email OTP** (6-digit codes, with better-auth's defaults for expiry and attempts) and **bearer**.
- **Allowlist:**
  - It's a Worker secret listing allowed emails, starting with the owner's, so the repository never shows them.
  - Requests for other addresses are refused before any email is sent, and the app shows that the address can't sign in.
  - New accounts are only ever created for allowlisted addresses.
- **Email:** codes are sent through Resend, from `hb@nhutien.com`. The Resend API key and the better-auth secret are Worker secrets.
- **Web:** uses same-origin session cookies.
- **Android:**
  - The WebView origin is `https://localhost`, so cookies would be third-party. The app uses bearer tokens instead.
  - The API exposes the session token header through CORS, lists `https://localhost` as a trusted origin, and the app keeps the token in secure device storage.
- **Rate limiting:** better-auth's rate limiting, keyed on Cloudflare's client IP header.
- Not used: passwords, Google or other social sign-in, magic links, passkeys, anonymous sessions.

### D1

- **Tables:** better-auth's tables, habits and day records. The habit and day-record tables carry the owning account and the server version.
- **Drizzle:** Drizzle defines every table and runs every query. better-auth's tables are generated as a Drizzle schema from the auth options and live next to our own.
- **Migrations:** drizzle-kit generates the SQL migrations from the Drizzle schema. Wrangler applies them to D1 as part of deploy, in local development and in tests.

### Web layouts and PWA

- One build chooses the phone layout or the desktop layout by screen width.
- The service worker caches the app shell so the app opens offline after the first visit. The manifest makes it installable.
- On load, the app requests persistent browser storage.
- While signed out on the web, the dismissible "only in this browser" note appears once per device.

### Android

- **Capacitor project:** lives inside the web app. The app id is under the owner's domain. The app calls the API at `https://hb.nhutien.com/api`.
- **Reminder:**
  - Implemented with Capacitor local notifications.
  - The app schedules the daily reminder for the next several days whenever habits or check-ins change, on app start and on day change.
  - It cancels today's reminder once every active build habit has today's check-in.
  - Future days' reminders name all active build habits, since none can be checked in ahead of time.
  - No reminder is scheduled if there are no active build habits.
  - Notification permission is requested when the reminder is turned on. Exact delivery time isn't guaranteed by Android.
- **Widget:**
  - **Placing:** a configuration screen picks one active habit. Each widget instance shows one habit, and the widget can be resized.
  - **Data:** after every change, the web app writes each habit's widget summary (name, colour, kind, quit day or last slip and the archived days since it, last check-in and the streak length ending at it, archived or deleted) to shared native storage through the custom plugin, which then refreshes the widgets.
  - **Midnight:** the widget recomputes its number at render time from the summary and today, and schedules its own refresh at midnight.
  - **Tapping:** opens the app on that habit through a deep link.
  - **Display-only:** there are no check-ins from the widget.
- **Release:**
  - A GitHub Actions workflow runs on version tags. It builds the web app, syncs Capacitor, builds a release APK signed with a keystore stored in repository secrets, and attaches the APK to a GitHub Release.
  - The Android version code is derived from the tag.
  - Obtainium tracks the repository's releases. If the repo is private, Obtainium needs a read-only token.

### Deploy

- One deploy script, run from the owner's Mac, builds the web app, applies D1 migrations and deploys the Worker with Wrangler.
- Local development runs the Worker with a local D1 next to the web dev server.

### Export

- Export produces one JSON file containing every habit (archived included, deleted excluded) with its check-ins or slips and its archived periods (file version 2; version 1 had no archived periods).
- The web downloads the file; Android opens the share sheet.

## Testing Decisions

- **What makes a good test:** it drives the system only through a public seam and checks what a user would observe, such as a habit's current streak, what a device shows after syncing, or whether sign-in succeeded. It never asserts on internals like collection state, SQL rows or request shapes. Tests control "today" with a fake clock rather than reaching into date code.
- **No prior art:** the repo has no tests yet. These are the first, run with `vp test` (Vitest through Vite+).
- **Seam 1: core package public functions.** This covers the domain rules:
  - build and quit streak counting;
  - current streak, including a build streak surviving through today before the check-in;
  - longest streak and goal date;
  - which days are editable (future locked, quit-only-after-quit-day);
  - calendar highlighting;
  - moving the quit day and the slips it removes;
  - slips on or before the quit day being ignored;
  - widget summaries and counting from a summary.

  Day changes are tested across midnight with a controlled clock.

- **Seam 2: devices plus server.** A test harness creates one or more simulated devices, each a real habit store with in-memory persistence. The devices talk to the real API Worker running in the Workers runtime with a local D1. Email sending is replaced by a capture, so tests can read sign-in codes. Devices can be taken offline and back online, and given different clocks. Required scenarios:
  - A signed-out device works fully with no server reachable.
  - Offline edits on two devices converge after both sync.
  - The same day is toggled on two devices, and the later edit wins.
  - A rename on one device and a colour change on the other both survive.
  - Delete wins over a concurrent edit or a newly logged day.
  - A quit-day move on one device and an offline slip before it on another: the result counts correctly on both.
  - Signing in with local habits merges everything, duplicates included.
  - Sign-out warns when changes are pending, and clears habits but keeps settings.
  - A non-allowlisted email is refused, and no email is captured.
  - Pushing the same batch twice changes nothing.
  - Reordering syncs.
- **Widget rule parity:** the Seam 1 tests export their widget-summary cases (summary, today, expected number) to a shared fixture file. A small Kotlin unit test runs the widget's native rule over the same file, so the two implementations can't drift.
- **Not covered by automated tests:**
  - Screens and layouts: verified by running the app.
  - Capacitor wiring, notifications and the widget's visuals: verified on the owner's phone.
  - The release workflow: verified by tagging a release and installing it through Obtainium.

## Out of Scope

- Google or any social sign-in, passwords, magic links, passkeys, anonymous accounts.
- Public sign-up, in-app account deletion, a privacy policy page, the Google Play Store, a paid tier, ads.
- Sharing habits, friends, accountability partners, leaderboards, public profiles.
- Build habit schedules (times per week, specific weekdays), amounts, rest days or freezes, pausing a habit.
- Counting quit habits by elapsed time instead of whole days; more than one slip per day.
- Changing a habit's kind.
- Per-habit reminders, reminders on the web, web push.
- Check-ins from the widget, widgets showing several habits.
- Importing data; matching habits by name on merge; a history of goals reached.
- Syncing settings; a night-owl day boundary; storing time zones.
- Languages other than English; date formats other than the current British style.
- Server rendering, a landing or marketing site, iOS.
- Deploying the Worker from CI.

## Further Notes

- **Risks to check early:**
  - TanStack DB 1.0 was still a release candidate at decision time, and its persistence only arrived in March 2026.
  - Whether Cloudflare's Vitest/Workers tooling and Vite plugin work cleanly under Vite+ hasn't been verified.
  - Whether OPFS wa-sqlite works inside the Android WebView hasn't been verified. Android uses native SQLite instead, so this only matters if that plan changes.
- **Build order:** each step leaves a working app, and this is the order the tickets should follow:
  1. core rename and new rules;
  2. web app, local-only and offline;
  3. API Worker with auth and sync;
  4. Android with reminders and the release workflow;
  5. the widget.
- **Signing key:** the APK signing keystore must never change or be lost, or Android won't install updates over the existing app. Keep a backup outside the CI secrets.
- **Clocks:** "later edit wins" uses device clocks, so a device with a wrong clock can occasionally win a conflict. That's accepted for one person's own devices (ADR-0002).
- **Email:** Resend needs DNS records added for `hb.nhutien.com` before codes can reach anyone other than the account owner's own address.
- **Design:** screen design work should use the design-taste frontend skill, starting from the playground's existing phone and desktop layouts.
