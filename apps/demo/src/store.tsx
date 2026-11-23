import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import {
  canToggle,
  defaultSettings,
  sampleHabits,
  todayISO,
  type ColorId,
  type Kind,
  type Settings,
  type Habit,
} from "@streakky/core";

type State = { habits: Habit[]; settings: Settings };

type Action =
  /** `quitDay` is only read for quit habits */
  | { type: "add"; name: string; kind: Kind; color: ColorId; quitDay: string; goal: number | null }
  | { type: "edit"; id: string; name: string; color: ColorId }
  /** build: add or remove a check-in. quit: add or remove a slip. Today when `day` is left out. */
  | { type: "toggle-day"; id: string; day?: string }
  | { type: "delete"; id: string }
  | { type: "goal"; id: string; goal: number | null }
  | { type: "erase" }
  | { type: "sample" }
  | { type: "settings"; patch: Partial<Settings> };

/** crypto.randomUUID only exists in secure contexts (HTTPS, localhost); a phone on the LAN isn't one. */
const newId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function reducer(state: State, a: Action): State {
  const map = (id: string, fn: (s: Habit) => Habit) => ({
    ...state,
    habits: state.habits.map((s) => (s.id === id ? fn(s) : s)),
  });
  switch (a.type) {
    case "add": {
      const base = { id: newId(), name: a.name, color: a.color, goal: a.goal };
      const habit: Habit =
        a.kind === "quit"
          ? { ...base, kind: "quit", quitDay: a.quitDay, slips: [] }
          : { ...base, kind: "build", checkIns: [] };
      return { ...state, habits: [...state.habits, habit] };
    }
    case "edit":
      return map(a.id, (s) => ({ ...s, name: a.name, color: a.color }));
    case "goal":
      return map(a.id, (s) => ({ ...s, goal: a.goal }));
    case "toggle-day": {
      const day = a.day ?? todayISO();
      return map(a.id, (s) => {
        if (!canToggle(s, day)) return s;
        const toggle = (days: string[]) =>
          days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
        return s.kind === "build"
          ? { ...s, checkIns: toggle(s.checkIns) }
          : { ...s, slips: toggle(s.slips) };
      });
    }
    case "delete":
      return { ...state, habits: state.habits.filter((s) => s.id !== a.id) };
    case "erase":
      return { ...state, habits: [] };
    case "sample":
      return { ...state, habits: sampleHabits() };
    case "settings":
      return { ...state, settings: { ...state.settings, ...a.patch } };
  }
}

type Store = State & { dispatch: (a: Action) => void; dark: boolean };

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, () => ({
    habits: sampleHabits(),
    settings: defaultSettings,
  }));
  const systemDark = useMedia("(prefers-color-scheme: dark)");
  const { theme, palette } = state.settings;
  const dark = theme === "dark" || (theme === "system" && systemDark);

  // the design system reads its theme from the page: data-palette and the dark class
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.palette = palette;
    root.classList.toggle("dark", dark);
    const ground = getComputedStyle(root).getPropertyValue("--background").trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", ground);
  }, [palette, dark]);

  return <Ctx.Provider value={{ ...state, dispatch, dark }}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

export function useMedia(query: string): boolean {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}
