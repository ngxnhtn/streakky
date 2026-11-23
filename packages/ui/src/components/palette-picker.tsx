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
          className="group/pal grid w-[60px] justify-items-center gap-1.5 rounded-[14px] py-1 text-xs text-muted-foreground outline-hidden transition-transform duration-120 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring active:scale-94 data-[state=on]:font-medium data-[state=on]:text-foreground hover-fine:text-foreground"
        >
          {/* the ring sits outside the swatch so it takes the app's colours, not the swatch's */}
          <span
            aria-hidden="true"
            className="rounded-full transition-shadow duration-150 group-data-[state=on]/pal:shadow-[0_0_0_3px_var(--background),0_0_0_5px_var(--foreground)]"
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
