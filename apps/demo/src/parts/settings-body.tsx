import { useId, useState } from "react";
import { currentStreakDays, historyStart, longestStreakDays, type Theme } from "@streakky/core";
import { Button } from "@streakky/ui/components/button";
import {
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@streakky/ui/components/dialog";
import { List, ListButton, ListGroup, ListItem, ListLabel } from "@streakky/ui/components/list";
import { PalettePicker } from "@streakky/ui/components/palette-picker";
import { Segmented } from "@streakky/ui/components/segmented";
import { Switch } from "@streakky/ui/components/switch";
import { cn } from "@streakky/ui/lib/utils";
import { Download, RotateCcw, Trash2 } from "lucide-react";
import { useStore } from "../store.tsx";
import { useDialogShape } from "./shape.tsx";

/** The settings groups and the erase dialog; phones and the web show the same body. */
export function SettingsBody({ className }: { className?: string }) {
  const { settings, habits, dispatch } = useStore();
  const { shape, className: dialogClass } = useDialogShape();
  const [erasing, setErasing] = useState(false);
  const timeId = useId();
  const set = (patch: Partial<typeof settings>) => dispatch({ type: "settings", patch });

  const exportCsv = () => {
    const rows = [
      ["name", "started", "days", "goal", "kind", "longest_streak"],
      ...habits.map((s) => [
        s.name,
        historyStart(s),
        String(currentStreakDays(s)),
        s.goal === null ? "" : String(s.goal),
        s.kind,
        String(longestStreakDays(s)),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "streakky.csv" });
    // Firefox and Safari read the blob after click() returns: attach the link, and revoke later
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className={className}>
      <ListGroup title="Appearance">
        <List>
          <ListItem stacked>
            <ListLabel>Theme</ListLabel>
            <Segmented<Theme>
              size="sm"
              label="Theme"
              value={settings.theme}
              onValueChange={(theme) => set({ theme })}
              options={[
                { value: "system", label: "System" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </ListItem>
          <ListItem stacked>
            <ListLabel>App colour</ListLabel>
            <PalettePicker value={settings.palette} onValueChange={(palette) => set({ palette })} />
          </ListItem>
          <ListItem stacked>
            <ListLabel>Week starts on</ListLabel>
            <Segmented
              size="sm"
              label="Week starts on"
              value={String(settings.weekStart)}
              onValueChange={(v) => set({ weekStart: v === "0" ? 0 : 1 })}
              options={[
                { value: "1", label: "Monday" },
                { value: "0", label: "Sunday" },
              ]}
            />
          </ListItem>
        </List>
      </ListGroup>

      <ListGroup title="Reminders">
        <List>
          <ListItem>
            <ListLabel>Evening check-in</ListLabel>
            <Switch
              aria-label="Evening check-in"
              checked={settings.dailyReminder}
              onCheckedChange={(dailyReminder) => set({ dailyReminder })}
            />
          </ListItem>
          <ListItem className={cn(!settings.dailyReminder && "[&>*]:opacity-40")}>
            <label htmlFor={timeId} className="text-[0.9375rem] font-medium">
              Time
            </label>
            <input
              id={timeId}
              type="time"
              value={settings.reminderTime}
              disabled={!settings.dailyReminder}
              onChange={(e) => set({ reminderTime: e.target.value })}
              className="min-h-9 border-0 bg-transparent text-right text-[0.9375rem] text-foreground tabular-nums"
            />
          </ListItem>
          <ListItem>
            <ListLabel>Goal celebrations</ListLabel>
            <Switch
              aria-label="Goal celebrations"
              checked={settings.celebrate}
              onCheckedChange={(celebrate) => set({ celebrate })}
            />
          </ListItem>
        </List>
      </ListGroup>

      <ListGroup title="Data">
        <List>
          <ListButton onClick={exportCsv} disabled={!habits.length}>
            Export as CSV
            <Download />
          </ListButton>
          <ListButton onClick={() => dispatch({ type: "sample" })}>
            Load sample habits
            <RotateCcw />
          </ListButton>
          <ListButton tone="destructive" onClick={() => setErasing(true)} disabled={!habits.length}>
            Erase all habits
            <Trash2 />
          </ListButton>
        </List>
      </ListGroup>

      <Dialog open={erasing} onOpenChange={setErasing}>
        <DialogContent shape={shape} className={dialogClass}>
          <DialogTitle>Erase all habits?</DialogTitle>
          <DialogDescription>
            {habits.length === 1
              ? "Your one habit and its history go for good."
              : `All ${habits.length} habits and their history go for good.`}{" "}
            Export a CSV first to keep a copy.
          </DialogDescription>
          <DialogActions>
            <Button
              variant="destructive"
              onClick={() => {
                dispatch({ type: "erase" });
                setErasing(false);
              }}
            >
              Erase all habits
            </Button>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </div>
  );
}
