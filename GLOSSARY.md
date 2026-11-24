# Streakky

Streakky is a habit tracker. People track habits they want to build and habits they want to quit, and watch their streaks grow day by day.

## Language

### Habits

**Habit**:
Something a person tracks day by day: either a build habit or a quit habit.
_Avoid_: Streak (for the tracked thing), tracker, routine

**Kind**:
Whether a habit is a build habit or a quit habit.
_Avoid_: Mode, type

**Build habit**:
A habit a person wants to do every day. Each day it is done is recorded as a check-in.
_Avoid_: Good habit, positive habit

**Quit habit**:
A habit a person wants to stop. Every day counts as clean unless a slip is recorded.
_Avoid_: Bad habit, negative habit

**Quit day**:
The day a person started tracking a quit habit; the first clean day is the day after. Build habits have no equivalent.
_Avoid_: Start date

**Archived habit**:
A habit hidden from everyday views, with its history kept so it can be restored. A quit habit stops counting while it's archived, and carries on from where it stopped once restored.
_Avoid_: Paused habit, hidden habit

**Archived period**:
One stretch of a habit's history spent archived: the day it was archived and the day it was restored, with no end yet while it still is. A habit keeps every one, even one restored the day it was archived. A quit habit's archived days are the days strictly between the two.
_Avoid_: Pause, archive span

### Days

**Day**:
A calendar date on the person's device, changing at local midnight. Check-ins and slips belong to days, not to moments in time.
_Avoid_: Timestamp, date-time

**Check-in**:
A day on which a build habit was done. A habit has at most one check-in per day. The verb is "check in".
_Avoid_: Mark, done, log (as a name for it)

**Slip**:
A day after a quit habit's quit day on which it was broken. A habit has at most one slip per day.
_Avoid_: Relapse, mark, failure

**Logged day**:
A day with a check-in (build habit) or a slip (quit habit). Logging is recording either one.
_Avoid_: Entry, mark

**Clean day**:
A day after a quit habit's quit day on which no slip was recorded, and which isn't an archived day.

**Archived day**:
A day a quit habit spent archived: from the day after it was archived to the day before it was restored. It is neither a clean day nor a slip, and doesn't end a streak. A build habit has none: its days while archived are days without check-ins.
_Avoid_: Paused day

### Streaks and goals

**Streak**:
An unbroken stretch of days: consecutive check-ins for a build habit, or clean days with no slip between them for a quit habit.
_Avoid_: Run, chain

**Current streak**:
The streak still going today. A build habit's current streak survives through today before today's check-in; a quit habit's grows by one each clean day.

**Longest streak**:
The longest streak in a habit's whole history.
_Avoid_: Best streak, longest run, record

**Goal**:
An optional target length for a habit's current streak. It is reached when the current streak hits it, and carries over to the next streak after a break.
_Avoid_: Target, milestone

**Celebration**:
What a device plays once when a habit's current streak reaches its goal, through a check-in, a slip-free day or the days passing. Setting a goal or moving a quit day never plays one, on the device that made the change or on any other. It can be turned off in Settings.
_Avoid_: Milestone, reward

### Devices and sync

**Sync**:
How a signed-in person's habits, check-ins and slips reach their other devices, through the server. A change waits on the device until sync carries it; Settings counts the changes waiting and says when the device last synced.
_Avoid_: Backup, upload
