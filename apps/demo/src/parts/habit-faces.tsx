import { counterLabel, currentStreak, loggedToday, statusLabel } from "@streakky/core";
import { Segmented } from "@streakky/ui/components/segmented";
import {
  NewHabitTile,
  HabitCard,
  HabitCollection,
  HabitRow,
} from "@streakky/ui/components/habit/habit-card";
import { LayoutGrid, Rows2 } from "lucide-react";
import { useStore } from "../store.tsx";

export function LayoutSwitch() {
  const { settings, dispatch } = useStore();
  return (
    <Segmented
      size="xs"
      label="Layout"
      value={settings.layout}
      onValueChange={(layout) => dispatch({ type: "settings", patch: { layout } })}
      className="mb-0.5 w-[5.75rem] flex-none"
      options={[
        { value: "grid", label: "Grid", icon: <LayoutGrid strokeWidth={1.75} /> },
        { value: "list", label: "List", icon: <Rows2 strokeWidth={1.75} /> },
      ]}
    />
  );
}

/** Every habit in the chosen layout, then the New habit tile. */
export function HabitFaces({
  onOpen,
  onAdd,
  className,
}: {
  onOpen: (id: string) => void;
  onAdd: () => void;
  className?: string;
}) {
  const { habits, settings } = useStore();
  const layout = settings.layout;
  return (
    <HabitCollection layout={layout} className={className}>
      {habits.map((s) => {
        const days = currentStreak(s).days;
        const face = {
          name: s.name,
          days,
          unit: counterLabel(s, days),
          status: statusLabel(s),
          kind: s.kind,
          color: s.color,
          today: { logged: loggedToday(s) },
          onClick: () => onOpen(s.id),
        };
        return layout === "grid" ? (
          <HabitCard key={s.id} {...face} />
        ) : (
          <HabitRow key={s.id} {...face} />
        );
      })}
      <NewHabitTile layout={layout} onClick={onAdd} />
    </HabitCollection>
  );
}
