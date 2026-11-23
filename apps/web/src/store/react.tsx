import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { Habit, Settings } from "@streakky/core";
import type { HabitStore } from "./habit-store.ts";

const StoreContext = createContext<HabitStore | null>(null);

export function HabitStoreProvider({
  store,
  children,
}: {
  store: HabitStore;
  children: ReactNode;
}) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

/** The habit store's commands, for screens that change habits. */
export function useHabitStore(): HabitStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useHabitStore outside HabitStoreProvider");
  return store;
}

/** Active habits in order; the screen re-renders whenever they change. */
export function useHabits(): Habit[] {
  const store = useHabitStore();
  return useSyncExternalStore(store.subscribe, store.habits);
}

/** One active habit, or undefined if there's none with that id; re-renders as `useHabits` does. */
export function useHabit(id: string): Habit | undefined {
  return useHabits().find((h) => h.id === id);
}

/** This device's settings; the screen re-renders whenever one changes. */
export function useSettings(): Settings {
  const store = useHabitStore();
  return useSyncExternalStore(store.subscribe, store.settings);
}
