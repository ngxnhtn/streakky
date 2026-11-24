import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { setTimeZone } from "@streakky/core";
import { applyAppearance } from "./appearance.ts";
import { insideNativeApp, type Platform } from "./platform.ts";
import { registerServiceWorker } from "./service-worker.ts";
import { openBrowserHabitStore } from "./store/browser.ts";
import { readSettings, type HabitStore } from "./store/habit-store.ts";
import type { KeyValueStorage } from "./store/key-value.ts";
import { HabitStoreProvider } from "./store/react.tsx";
import "./fonts.css";
import "./styles.css";

const root = createRoot(document.getElementById("root")!);
const native = insideNativeApp();

/**
 * Puts the device's settings to work before its database opens, so a dark theme never starts as a
 * light page and no day is worked out in the wrong time zone. Says whether the page is dark.
 */
function applySettings(keyValues: KeyValueStorage): boolean {
  const settings = readSettings(keyValues);
  setTimeZone(settings.timeZone);
  return applyAppearance(settings);
}

/** The habit store on this platform's storage, with what the app takes from the platform. */
async function openApp(): Promise<{ store: HabitStore; platform: Platform }> {
  if (native) {
    const { openAndroidApp } = await import("./android.ts");
    return openAndroidApp(applySettings);
  }
  applySettings(window.localStorage);
  registerServiceWorker();
  return { store: await openBrowserHabitStore(), platform: {} };
}

openApp().then(
  ({ store, platform }) => {
    // days follow the settings' time zone, which `applySettings` set before the store opened (the
    // same zone the store keeps on a first open); this listener, added before the screens', sets
    // it again the moment it changes, so no screen works out a day in the old zone
    let timeZone = store.settings().timeZone;
    store.subscribe(() => {
      if (store.settings().timeZone === timeZone) return;
      timeZone = store.settings().timeZone;
      setTimeZone(timeZone);
    });
    root.render(
      <StrictMode>
        <HabitStoreProvider store={store}>
          <App platform={platform} />
        </HabitStoreProvider>
      </StrictMode>,
    );
  },
  (error: unknown) => {
    console.error(error);
    root.render(
      <main className="mx-auto max-w-[26.25rem] px-6 py-16 text-foreground">
        <h1 className="text-xl font-medium">Streakky can't open its storage</h1>
        <p className="mt-2 text-muted-foreground">
          {native
            ? "The app couldn't open its database on this phone. Try closing and opening it again."
            : "This browser won't let the app keep data on this device. Try an up-to-date Chrome, Edge, Firefox or Safari, outside private browsing."}
        </p>
      </main>,
    );
  },
);
