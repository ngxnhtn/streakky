import { useState } from "react";
import { ChevronRight, Download } from "lucide-react";
import {
  LAYOUTS,
  THEMES,
  WEEK_STARTS,
  type Layout,
  type Theme,
  type WeekStart,
} from "@streakky/core";
import { List, ListButton, ListGroup, ListItem, ListLabel } from "@streakky/ui/components/list";
import { PalettePicker } from "@streakky/ui/components/palette-picker";
import { Segmented } from "@streakky/ui/components/segmented";
import { Switch } from "@streakky/ui/components/switch";
import { usePlatform } from "../platform.ts";
import { saveFile } from "../save-file.ts";
import { useArchivedHabits, useHabitStore, useSettings } from "../store/react.tsx";
import { AccountSettings } from "./AccountSettings.tsx";
import { ReminderSettings } from "./Reminder.tsx";
import { SaveError } from "./saving.tsx";
import { Screen } from "./screen.tsx";
import { useNav } from "./stack.tsx";

/** A setting's choices from core, as a segmented control's options. */
const optionsOf = <T extends string | number>(choices: { id: T; name: string }[]) =>
  choices.map(({ id, name }) => ({ value: id, label: name }));

/** This device's settings. Each change applies at once and stays on the device. */
export function Settings() {
  const { push } = useNav();
  const store = useHabitStore();
  const settings = useSettings();
  const archived = useArchivedHabits();
  const { reminders } = usePlatform();
  const [exportFailed, setExportFailed] = useState(false);
  // a download can't fail, but the Android app's share sheet can be refused its file
  const exportHabits = () => {
    setExportFailed(false);
    saveFile(store.exportHabits()).catch((cause: unknown) => {
      console.error(cause);
      setExportFailed(true);
    });
  };
  return (
    <Screen title="Settings">
      {/* as wide as reads well on the desktop */}
      <div className="max-w-[35rem] px-5">
        <AccountSettings />
        <ListGroup title="Appearance">
          <List>
            <ListItem stacked>
              <ListLabel>Theme</ListLabel>
              <Segmented<Theme>
                label="Theme"
                value={settings.theme}
                onValueChange={(theme) => store.changeSettings({ theme })}
                options={optionsOf(THEMES)}
              />
            </ListItem>
            <ListItem stacked>
              <ListLabel>App colour</ListLabel>
              <PalettePicker
                value={settings.palette}
                onValueChange={(palette) => store.changeSettings({ palette })}
              />
            </ListItem>
            <ListItem stacked>
              <ListLabel>Home layout</ListLabel>
              <Segmented<Layout>
                label="Home layout"
                value={settings.layout}
                onValueChange={(layout) => store.changeSettings({ layout })}
                options={optionsOf(LAYOUTS)}
              />
            </ListItem>
            <ListItem stacked>
              <ListLabel>Week starts on</ListLabel>
              <Segmented<WeekStart>
                label="Week starts on"
                value={settings.weekStart}
                onValueChange={(weekStart) => store.changeSettings({ weekStart })}
                options={optionsOf(WEEK_STARTS)}
              />
            </ListItem>
            <ListItem>
              <ListLabel>Goal celebrations</ListLabel>
              <Switch
                aria-label="Goal celebrations"
                checked={settings.celebrate}
                onCheckedChange={(celebrate) => store.changeSettings({ celebrate })}
              />
            </ListItem>
          </List>
        </ListGroup>
        {reminders && <ReminderSettings reminders={reminders} />}
        <ListGroup title="Data">
          <List>
            <ListButton onClick={() => push({ name: "archived" })}>
              Archived habits
              <span className="flex items-center gap-1.5 font-normal text-muted-foreground tabular-nums">
                {archived.length > 0 && archived.length}
                <ChevronRight />
              </span>
            </ListButton>
            <ListButton onClick={exportHabits}>
              Export as JSON
              <Download />
            </ListButton>
          </List>
          {exportFailed && (
            <div className="mx-1 mt-2.5">
              <SaveError>Couldn't export. Try again.</SaveError>
            </div>
          )}
        </ListGroup>
      </div>
    </Screen>
  );
}
