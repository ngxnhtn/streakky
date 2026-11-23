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
A habit hidden from everyday views, with its history kept so it can be restored.
_Avoid_: Paused habit, hidden habit

### Days

**Day**:
A calendar date on the person's device, changing at local midnight. Check-ins and slips belong to days, not to moments in time.
_Avoid_: Timestamp, date-time

**Check-in**:
A day on which a build habit was done. A habit has at most one check-in per day.
_Avoid_: Mark, log, done

**Slip**:
A day after a quit habit's quit day on which it was broken. A habit has at most one slip per day.
_Avoid_: Relapse, mark, failure

**Clean day**:
A day after a quit habit's quit day on which no slip was recorded.

### Streaks and goals

**Streak**:
An unbroken stretch of days: consecutive check-ins for a build habit, or consecutive clean days for a quit habit.
_Avoid_: Run, chain

**Current streak**:
The streak still going today. A build habit's current streak survives through today before today's check-in; a quit habit's grows by one each day without a slip.

**Longest streak**:
The longest streak in a habit's whole history.
_Avoid_: Best streak, longest run, record

**Goal**:
An optional target length for a habit's current streak. It is reached when the current streak hits it, and carries over to the next streak after a break.
_Avoid_: Target, milestone
