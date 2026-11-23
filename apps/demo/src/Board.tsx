import { useEffect, useState } from "react";
import { App, type Route } from "./mobile/App.tsx";
import { useMedia } from "./store.tsx";
import { WebApp } from "./web/WebApp.tsx";

const PHONE_W = 410;
const PHONE_H = 864;
const GAP = 56;

const SCREENS: { label: string; initial: Route[] }[] = [
  { label: "Streaks", initial: [{ name: "home" }] },
  { label: "Streak", initial: [{ name: "home" }, { name: "detail", id: "run" }] },
  { label: "Settings", initial: [{ name: "home" }, { name: "settings" }] },
];

function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

/** Fit three phones on the screen; below 0.62 the row scrolls sideways instead. */
function useFit(): { zoom: number; scroll: boolean } {
  const read = () => {
    const byH = (window.innerHeight - 150) / PHONE_H;
    const byW = (window.innerWidth - 96) / (PHONE_W * 3 + GAP * 2);
    if (byW >= 0.62) return { zoom: Math.min(1, byH, byW), scroll: false };
    return { zoom: Math.min(1, Math.max(0.62, byH)), scroll: true };
  };
  const [fit, setFit] = useState(read);
  useEffect(() => {
    const on = () => setFit(read());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return fit;
}

/** The demo page: three phones side by side, or the web app at #web. On a phone, the app alone. */
export function Board() {
  const solo = useMedia("(max-width: 640px)");
  const { zoom, scroll } = useFit();
  const web = useHash() === "#web";

  if (web && !solo) {
    return (
      <>
        <h1 className="sr-only">Streakky web app</h1>
        <WebApp />
      </>
    );
  }
  if (solo) {
    return (
      <main className="h-dvh pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <h1 className="sr-only">Streakky</h1>
        <App initial={[{ name: "home" }]} framed={false} />
      </main>
    );
  }

  const switchLink =
    "rounded-full px-4 py-[7px] text-sm font-medium no-underline transition-colors aria-[current=page]:bg-foreground aria-[current=page]:text-background hover-fine:not-aria-[current=page]:bg-foreground/10";
  return (
    <div className="flex min-h-dvh flex-col bg-[color-mix(in_oklab,var(--foreground)_6%,var(--muted))] text-foreground transition-colors duration-300 dark:bg-[color-mix(in_oklab,black_22%,var(--background))]">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 px-12 py-[22px] max-[900px]:px-6">
        <p className="flex items-center gap-2 text-lg font-semibold tracking-[-0.025em]">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M5.64 18.36A9 9 0 1 1 18.36 18.36" />
          </svg>
          Streakky
        </p>
        <nav aria-label="Demo version" className="flex gap-1 rounded-full bg-foreground/8 p-[3px]">
          <a href="#" aria-current="page" className={switchLink}>
            Mobile
          </a>
          <a href="#web" className={switchLink}>
            Web
          </a>
        </nav>
        <p className="justify-self-end font-mono text-xs text-muted-foreground max-[900px]:hidden">
          UI demo · three screens, one shared set of streaks
        </p>
      </header>
      <main
        className={
          scroll
            ? "flex-1 snap-x snap-mandatory scroll-px-12 overflow-x-auto px-6 pt-1 pb-10"
            : "flex flex-1 justify-center px-12 pt-1 pb-10 max-[900px]:px-6"
        }
      >
        <h1 className="sr-only">Streakky app screens</h1>
        <div className="flex gap-14" style={{ zoom }}>
          {SCREENS.map((s, i) => (
            <div key={s.label} className="snap-start">
              <p className="mb-3.5 ml-2 flex gap-2.5 font-mono text-[13px] text-muted-foreground">
                <span className="text-foreground">0{i + 1}</span>
                {s.label}
              </p>
              <div className="h-[864px] w-[410px] rounded-[62px] bg-[#0c1b1d] p-2.5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),0_40px_80px_-40px_rgb(0_0_0/0.45)]">
                <div className="relative isolate h-full [transform:translateZ(0)] overflow-hidden rounded-[52px]">
                  <App initial={s.initial} framed />
                  <span
                    aria-hidden="true"
                    className="absolute top-[11px] left-1/2 z-60 h-9 w-[124px] -translate-x-1/2 rounded-[20px] bg-black"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
