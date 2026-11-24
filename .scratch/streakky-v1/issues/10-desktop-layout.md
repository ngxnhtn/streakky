# 10: Desktop layout

**What to build:** On a wide screen the web app shows the desktop layout from the design playground: my habits alongside the selected habit's detail. On a narrow screen, including the web app on a phone, it shows the phone layout. The same build switches layout from the screen width, live as the window is resized.

**Spec:** Streakky v1 spec, user stories 64–66, and section "Web layouts and PWA".

**Blocked by:** 04 (Habit detail)

**Status:** done

- [x] Wide screens get the desktop layout, built from the playground's design, and narrow screens get the phone layout.
- [x] Resizing across the breakpoint switches layout without losing the selected habit or any unsaved input.
- [x] Every screen that exists so far is reachable in both layouts.
- [x] `vp check` and `vp test` pass.

## Comments

**Done (2026-11-24).**

- **One stack, two layouts:**
  - `ScreenStack` keeps its one stack of screens and its history in both layouts. In the phone layout the screens slide as before.
  - On the desktop (`DesktopProvider` in `screens/desktop.tsx`: 48rem wide and 30rem tall, never in the Android app), the screen in front is the page beside `Sidebar`. The screens beneath stay mounted but hidden, and nothing slides.
  - The page's elements are the same in both layouts, and the sidebar's place is held while it's away. So crossing the breakpoint keeps the selected habit and every screen's state, and New habit, Edit habit and Sign in keep what was typed.
- **`Screen`** (`screens/screen.tsx`) replaces each screen's `AppBar` and `ScreenScroll`:
  - **Phone:** an app bar, or Home's big heading.
  - **Desktop:** the playground's page header, with a line over the heading and controls beside it. A labelled back button ("Back to settings") shows on every screen but the sidebar's own pages (`sidebarPage` in the route table).
  - A screen's body sits in the same place in both, so forms keep their state.
- **Sidebar** (from the playground's `WebApp`):
  - the mark, New habit, All habits with its count, "Your habits" with each active habit's colour, name, today's tick and count, and Settings at the foot;
  - the page showing marked `aria-current`, and each habit named with its count and tick;
  - first in the page, so Tab reaches it first.
- **Pages:**
  - **Home:** "All habits" with the grid/list switch by its heading and the playground's wider cards.
  - **A habit's page:** its ring and today's action, calendar (a year of weeks), stats and goal as cards, in one column below 68.75rem. Its options ("Edit habit", "Archive habit" or "Restore habit", "Delete habit") are buttons by the heading, from the same list as the phone's sheet (`useHabitOptions`).
  - Settings and Archived habits keep a readable width, and Sign in its centred column.
  - Dialogs take their shape from `DialogShapeProvider` in the UI package: sheets on the phone, centred on the desktop.
- **New habit** lives above the screens (`NewHabitProvider`), so the sidebar opens it from any page. It closes when another screen comes in front.
- **History:**
  - Each sidebar page is its own history entry (`nav.go`), so the browser's back goes to the page before.
  - `pop` remembers each entry's screens. When the entry before isn't the screen beneath, as after moving between sidebar pages, it goes up instead, replacing the entry. So archiving or deleting from a habit's page lands on All habits, and a phone back press after desktop browsing reaches Home.
  - A consequence: after that, the browser's back from Home goes to the page visited before, not out of the app.
- **Checked in headless Chrome** (`vp dev` with `vp run api#dev`), 41 checks:
  - **Desktop pages:** the layout at 1280; New habit as a centred dialog; three habits in the sidebar with counts; a habit's page with the heading focused, its four cards, and its check-in showing in the sidebar.
  - **Across the breakpoint:** resized to 400, the same habit in the phone layout. Edit habit, New habit and Sign in each kept their typed text both ways.
  - **Navigation:**
    - Settings and Sign in, with Settings still marked and "Back to settings".
    - The phone's back reached Settings.
    - Archive from the page landed on All habits, and the habit left the sidebar.
    - The archived habit's page, from Archived habits, had its way back and no Goal card, and Restore brought it back.
    - Delete asked, starting on Cancel, and landed on All habits.
    - The browser's back went back a page.
    - Sign in from Home's note had "Back to habits".
  - **Keyboard and widths:** Tab started in the sidebar. The desktop layout showed at 768, 820, 1024 and 1440, and the phone layout at 320×640 and 844×390, with no sideways scroll at any of them. No console errors.
- **The design skill:** loaded, as the owner asked for screen work. Its marketing-site machinery (the gate, dealt palettes, photographs) doesn't fit an app screen built from the owner's own playground design. Its rules on even edges, no overlap at any width, 44px targets, visible focus and reduced motion were checked here.
- **Not kept across a resize:** the calendar's own state (Edit days, the month on show, the scroll position) starts again when the layout switches, as it does on the phone when its tabs change. Nothing typed is lost.
- **Not checked:** a real tablet or foldable.
