import { ChevronLeft, Download } from "lucide-react";
import type { Layout, Theme } from "@streakky/core";
import { AppBar } from "@streakky/ui/components/app-bar";
import { Button } from "@streakky/ui/components/button";
import { List, ListButton, ListGroup, ListItem, ListLabel } from "@streakky/ui/components/list";
import { PalettePicker } from "@streakky/ui/components/palette-picker";
import { Segmented } from "@streakky/ui/components/segmented";
import { Switch } from "@streakky/ui/components/switch";
import { saveFile } from "../save-file.ts";
import { useHabitStore, useSettings } from "../store/react.tsx";
import { AccountSettings } from "./AccountSettings.tsx";
import { ScreenScroll, useNav } from "./stack.tsx";

/** This device's settings. Each change applies at once and stays on the device. */
export function Settings() {
  const { pop } = useNav();
  const store = useHabitStore();
  const settings = useSettings();
  return (
    <>
      <AppBar
        left={
          <Button variant="ghost" size="icon" aria-label="Back to habits" onClick={pop}>
            <ChevronLeft strokeWidth={1.75} />
          </Button>
        }
        title="Settings"
      />
      <ScreenScroll>
        <div className="px-5">
          <AccountSettings />
          <ListGroup title="Appearance">
            <List>
              <ListItem stacked>
                <ListLabel>Theme</ListLabel>
                <Segmented<Theme>
                  label="Theme"
                  value={settings.theme}
                  onValueChange={(theme) => store.changeSettings({ theme })}
                  options={[
                    { value: "system", label: "System" },
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                  ]}
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
                  options={[
                    { value: "grid", label: "Grid" },
                    { value: "list", label: "List" },
                  ]}
                />
              </ListItem>
              <ListItem stacked>
                <ListLabel>Week starts on</ListLabel>
                <Segmented
                  label="Week starts on"
                  value={String(settings.weekStart)}
                  onValueChange={(value) =>
                    store.changeSettings({ weekStart: value === "0" ? 0 : 1 })
                  }
                  options={[
                    { value: "1", label: "Monday" },
                    { value: "0", label: "Sunday" },
                  ]}
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
          <ListGroup title="Data">
            <List>
              <ListButton onClick={() => void saveFile(store.exportHabits())}>
                Export as JSON
                <Download />
              </ListButton>
            </List>
          </ListGroup>
        </div>
      </ScreenScroll>
    </>
  );
}
