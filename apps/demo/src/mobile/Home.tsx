import { useState } from "react";
import { fmtLong, today } from "@streakky/core";
import { AppBar } from "@streakky/ui/components/app-bar";
import { Button } from "@streakky/ui/components/button";
import { Menu, Plus } from "lucide-react";
import { EmptyStreaks } from "../parts/empty.tsx";
import { NewStreakDialog } from "../parts/new-streak-dialog.tsx";
import { LayoutSwitch, StreakFaces } from "../parts/streak-faces.tsx";
import { useStore } from "../store.tsx";
import { ScreenScroll, useNav } from "./App.tsx";

export function Home() {
  const { streaks } = useStore();
  const { push } = useNav();
  const [adding, setAdding] = useState(false);
  return (
    <>
      <AppBar
        left={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Settings"
            onClick={() => push({ name: "settings" })}
          >
            <Menu strokeWidth={1.75} />
          </Button>
        }
        right={
          <Button
            variant="ring"
            size="icon"
            aria-label="New streak"
            onClick={() => setAdding(true)}
          >
            <Plus strokeWidth={1.75} />
          </Button>
        }
      />
      <ScreenScroll>
        <header className="flex items-end justify-between gap-4 px-5 pt-1 pb-5">
          <div>
            <p className="text-sm text-muted-foreground">{fmtLong(today())}</p>
            <h1 className="mt-0.5 font-display text-4xl leading-[1.05] font-medium tracking-[-0.032em] [font-stretch:96%]">
              Streaks
            </h1>
          </div>
          {streaks.length > 0 && <LayoutSwitch />}
        </header>
        <div className="px-5 pb-5">
          {streaks.length === 0 ? (
            <EmptyStreaks onAdd={() => setAdding(true)} />
          ) : (
            <StreakFaces
              onOpen={(id) => push({ name: "detail", id })}
              onAdd={() => setAdding(true)}
            />
          )}
        </div>
      </ScreenScroll>
      <NewStreakDialog open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
