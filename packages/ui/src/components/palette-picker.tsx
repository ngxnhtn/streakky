import { PALETTES, type PaletteId } from "@streakky/core";
import { ToggleGroup, ToggleGroupItem } from "@streakky/ui/components/toggle-group";
import { cn } from "@streakky/ui/lib/utils";

/**
 * The app colour themes. Each swatch carries its own data-palette, so it shows that theme's
 * ground and ink in the current mode.
 */
export function PalettePicker({
  value,
  onValueChange,
  label = "App colour",
  className,
}: {
  value: PaletteId;
  onValueChange: (id: PaletteId) => void;
  label?: string;
  className?: string;
}) {
  return (
    <ToggleGroup
      value={value}
      onValueChange={onValueChange}
      aria-label={label}
      className={cn("-mx-1 gap-x-0.5 gap-y-1", className)}
    >
      {PALETTES.map((p) => (
        <ToggleGroupItem
          key={p.id}
          value={p.id}
          className="group/pal grid w-[3.75rem] justify-items-center gap-1.5 rounded-[0.875rem] py-1 text-xs text-muted-foreground transition-transform duration-120 focus-ring-flush active:scale-94 data-[state=on]:font-medium data-[state=on]:text-foreground hover-fine:text-foreground"
        >
          {/* the ring sits outside the swatch so it takes the app's colours, not the swatch's */}
          <span
            aria-hidden="true"
            className="rounded-full transition-shadow duration-150 group-data-[state=on]/pal:shadow-[0_0_0_0.1875rem_var(--background),0_0_0_0.3125rem_var(--foreground)]"
          >
            <span
              data-palette={p.id}
              className="block size-10 rounded-full bg-[linear-gradient(135deg,var(--background)_50%,var(--foreground)_50%)] shadow-[inset_0_0_0_1px_var(--input)]"
            />
          </span>
          {p.name}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
