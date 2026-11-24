import { useEffect, useId, useState } from "react";
import { isReminderTime, reminderPlan, stillToCheckIn, toISO } from "@streakky/core";
import { List, ListGroup, ListItem, ListLabel } from "@streakky/ui/components/list";
import { Switch } from "@streakky/ui/components/switch";
import { cn } from "@streakky/ui/lib/utils";
import type { Reminders } from "../platform.ts";
import { useHabits, useHabitStore, useSettings } from "../store/react.tsx";
import { useToday } from "./use-today.ts";

/**
 * Settings' daily reminder, in the Android app: on or off, and when. Turning it on asks Android
 * to let the app show notifications; if it may not, the reminder stays off and this says why.
 */
export function ReminderSettings({ reminders }: { reminders: Reminders }) {
  const store = useHabitStore();
  const { dailyReminder, reminderTime } = useSettings();
  const timeId = useId();
  // why the reminder didn't turn on: notifications refused, or Android not answering the ask
  const [notOn, setNotOn] = useState<"refused" | "failed" | null>(null);

  const turnReminder = async (on: boolean) => {
    setNotOn(null);
    if (on) {
      try {
        if (!(await reminders.allow())) return setNotOn("refused");
      } catch (error) {
        console.error("Android didn't answer the ask for notifications:", error);
        return setNotOn("failed");
      }
    }
    store.changeSettings({ dailyReminder: on });
  };

  return (
    <ListGroup title="Reminder">
      <List>
        <ListItem>
          <ListLabel>Daily reminder</ListLabel>
          <Switch
            aria-label="Daily reminder"
            checked={dailyReminder}
            onCheckedChange={(on) => void turnReminder(on)}
          />
        </ListItem>
        <ListItem className={cn(!dailyReminder && "[&>*]:opacity-40")}>
          <label htmlFor={timeId} className="text-[0.9375rem] font-medium">
            Time
          </label>
          <input
            id={timeId}
            type="time"
            value={reminderTime}
            disabled={!dailyReminder}
            onChange={(event) => {
              if (isReminderTime(event.target.value)) {
                store.changeSettings({ reminderTime: event.target.value });
              }
            }}
            className="min-h-11 border-0 bg-transparent text-right text-[0.9375rem] text-foreground tabular-nums focus-ring"
          />
        </ListItem>
      </List>
      <p role="status" className="mx-1 mt-2.5 text-[0.8125rem] text-muted-foreground empty:hidden">
        {notOn === "refused"
          ? "Streakky isn't allowed to send notifications. Allow them in Android's settings for Streakky, then turn the reminder on."
          : notOn === "failed"
            ? "Android didn't answer when asked about notifications. Try again."
            : dailyReminder
              ? "On days when a build habit still has no check-in, at this time, naming those habits."
              : ""}
      </p>
    </ListGroup>
  );
}

/**
 * Keeps the daily reminder's notifications in step with the habits (`reminderPlan`): scheduled a
 * week ahead whenever the active habits or their check-ins change, the reminder is turned on or
 * off or moved, the app opens and the day changes, and none while it's off. Notifications taken
 * back in Android's settings turn the reminder off. Renders nothing.
 */
export function ReminderSchedule({ reminders }: { reminders: Reminders }) {
  const store = useHabitStore();
  const habits = useHabits();
  const { dailyReminder, reminderTime } = useSettings();
  const day = useToday();
  useEffect(() => {
    let current = true;
    // a moment later, so a burst of check-ins schedules once
    const timer = window.setTimeout(async () => {
      try {
        if (dailyReminder && !(await reminders.allowed())) {
          if (current) store.changeSettings({ dailyReminder: false });
          return;
        }
        if (!current) return;
        const now = new Date();
        await reminders.schedule(
          dailyReminder ? reminderPlan(habits, reminderTime, now) : [],
          dailyReminder ? stillToCheckIn(habits, toISO(now)) : [],
        );
      } catch (error) {
        console.error("The daily reminder couldn't be scheduled:", error);
      }
    }, 300);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [store, reminders, habits, dailyReminder, reminderTime, day]);
  return null;
}
