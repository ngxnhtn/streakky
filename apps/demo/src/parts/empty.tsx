import { Button } from "@streakky/ui/components/button";

export function EmptyStreaks({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="max-w-[480px] rounded-3xl bg-muted px-6 pt-7 pb-6">
      <p className="text-xl font-medium tracking-[-0.015em]">Nothing counted yet</p>
      <p className="mt-1.5 mb-5 text-muted-foreground">
        Add a habit to build, like a morning run, or one to quit, like smoking.
      </p>
      <Button className="w-full" onClick={onAdd}>
        Add a streak
      </Button>
    </div>
  );
}
