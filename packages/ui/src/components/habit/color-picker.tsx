import { HABIT_COLORS, type ColorId } from "@streakky/core";
import { ToggleGroup, ToggleGroupItem } from "@streakky/ui/components/toggle-group";
import { cn } from "@streakky/ui/lib/utils";

/** The six habit colours as swatches; each takes its value from data-habit-color. */
export function HabitColorPicker({
  value,
  onValueChange,
  className,
}: {
  value: ColorId;
  onValueChange: (id: ColorId) => void;
  className?: string;
}) {
  return (
    <ToggleGroup
      value={value}
      onValueChange={onValueChange}
      aria-label="Colour"
      className={cn("-mx-1.5 gap-1", className)}
    >
      {HABIT_COLORS.map((c) => (
        <ToggleGroupItem
          key={c.id}
          value={c.id}
          aria-label={c.name}
          data-habit-color={c.id}
          className="grid size-12 place-items-center rounded-full outline-hidden transition-transform duration-120 before:size-[1.875rem] before:rounded-full before:bg-habit before:transition-shadow focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring active:scale-92 data-[state=on]:before:shadow-[0_0_0_0.1875rem_var(--background),0_0_0_0.3125rem_var(--habit)]"
        />
      ))}
    </ToggleGroup>
  );
}
