import { counterLabel, currentRun, fmtDayMonth, markedToday, type Streak } from "@streakky/core";
import { Segmented } from "@streakky/ui/components/segmented";
import {
  NewStreakTile,
  StreakCard,
  StreakCollection,
  StreakRow,
} from "@streakky/ui/components/streak/streak-card";
import { LayoutGrid, Rows2 } from "lucide-react";
import { useStore } from "../store.tsx";

/** The line under a name in the list: what today needs, or how long it has run. */
export function statusOf(s: Streak): string {
  const run = currentRun(s);
  if (s.mode === "quit") {
    if (markedToday(s)) return "Slip logged today";
    return run.days === 0 ? "Started today" : `Since ${fmtDayMonth(run.start)}`;
  }
  if (markedToday(s)) return "Done today";
  return run.days === 0 ? "Log today to start" : "Not logged today";
}

export function LayoutSwitch() {
  const { settings, dispatch } = useStore();
  return (
    <Segmented
      size="xs"
      label="Layout"
      value={settings.layout}
      onValueChange={(layout) => dispatch({ type: "settings", patch: { layout } })}
      className="mb-0.5 w-[92px] flex-none"
      options={[
        { value: "grid", label: "Grid", icon: <LayoutGrid strokeWidth={1.75} /> },
        { value: "list", label: "List", icon: <Rows2 strokeWidth={1.75} /> },
      ]}
    />
  );
}

/** Every streak in the chosen layout, then the New streak tile. */
export function StreakFaces({
  onOpen,
  onAdd,
  className,
}: {
  onOpen: (id: string) => void;
  onAdd: () => void;
  className?: string;
}) {
  const { streaks, settings } = useStore();
  const layout = settings.layout;
  return (
    <StreakCollection layout={layout} className={className}>
      {streaks.map((s) => {
        const days = currentRun(s).days;
        const face = {
          name: s.name,
          days,
          label: counterLabel(s, days),
          mode: s.mode,
          color: s.color,
          done: markedToday(s),
          onClick: () => onOpen(s.id),
        };
        return layout === "grid" ? (
          <StreakCard key={s.id} {...face} />
        ) : (
          <StreakRow key={s.id} {...face} status={statusOf(s)} />
        );
      })}
      <NewStreakTile layout={layout} onClick={onAdd} />
    </StreakCollection>
  );
}
