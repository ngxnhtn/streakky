import { useId, useMemo } from "react";
import { deviceTimeZone, isTimeZone, sameTimeZone } from "@streakky/core";
import { List, ListButton, ListGroup, ListItem } from "@streakky/ui/components/list";
import { useHabitStore, useSettings } from "../store/react.tsx";

/** A zone as Settings names it, with its offset from UTC as of now: "Asia/Ho Chi Minh (UTC+7)". */
function zoneName(zone: string, now: Date): string {
  const offset = new Intl.DateTimeFormat("en-GB", { timeZone: zone, timeZoneName: "shortOffset" })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")
    ?.value.replace("GMT", "UTC");
  return `${zone.replaceAll("_", " ")}${offset ? ` (${offset})` : ""}`;
}

/** Every time zone the device knows, the one in use among them even if it's an alias. */
function zonesWith(current: string): string[] {
  const known = Intl.supportedValuesOf("timeZone");
  return known.includes(current) ? known : [current, ...known];
}

/**
 * Settings' time zone: the zone days follow, set to the device's own when the app first opened
 * on it and kept when the device travels, so the days and the reminder don't move with it. When
 * the device is somewhere else now, it offers that zone.
 */
export function TimeZoneSettings() {
  const store = useHabitStore();
  const { timeZone } = useSettings();
  const zoneId = useId();
  const here = deviceTimeZone();
  // the same zone under another of its names, such as "Asia/Saigon", isn't somewhere else
  const elsewhere = !sameTimeZone(here, timeZone);
  // some four hundred names, each with its offset: worked out again only when the zone changes
  const zones = useMemo(() => {
    const now = new Date();
    return zonesWith(timeZone).map((zone) => ({ zone, name: zoneName(zone, now) }));
  }, [timeZone]);

  return (
    <ListGroup title="Days">
      <List>
        <ListItem>
          <label htmlFor={zoneId} className="flex-none text-[0.9375rem] font-medium">
            Time zone
          </label>
          <select
            id={zoneId}
            value={timeZone}
            onChange={(event) => {
              if (isTimeZone(event.target.value)) {
                store.changeSettings({ timeZone: event.target.value });
              }
            }}
            className="min-h-11 min-w-0 truncate border-0 bg-transparent text-right text-[0.9375rem] text-foreground focus-ring"
          >
            {zones.map(({ zone, name }) => (
              <option key={zone} value={zone}>
                {name}
              </option>
            ))}
          </select>
        </ListItem>
        {elsewhere && (
          <ListButton onClick={() => store.changeSettings({ timeZone: here })}>
            Use this device's zone
            <span className="min-w-0 truncate font-normal text-muted-foreground">
              {zoneName(here, new Date())}
            </span>
          </ListButton>
        )}
      </List>
      <p className="mx-1 mt-2.5 text-[0.8125rem] text-muted-foreground">
        {!elsewhere
          ? "Each day starts at midnight in this zone, wherever this device goes."
          : "This device is in another zone now. Your days still keep to the zone above."}
      </p>
    </ListGroup>
  );
}
