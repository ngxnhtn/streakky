import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { applyAppearance } from "./appearance.ts";
import { insideNativeApp, type Platform } from "./platform.ts";
import { registerServiceWorker } from "./service-worker.ts";
import { openBrowserHabitStore } from "./store/browser.ts";
import { readSettings, type HabitStore } from "./store/habit-store.ts";
import { HabitStoreProvider } from "./store/react.tsx";
import "./fonts.css";
import "./styles.css";

const root = createRoot(document.getElementById("root")!);
const native = insideNativeApp();

/**
 * The habit store on this platform's storage, with what the app takes from the platform. Each
 * puts the device's theme on the page before its database opens, so a dark theme never starts as
 * a light page.
 */
async function openApp(): Promise<{ store: HabitStore; platform: Platform }> {
  if (native) {
    const { openAndroidApp } = await import("./android.ts");
    return openAndroidApp((keyValues) => applyAppearance(readSettings(keyValues)));
  }
  applyAppearance(readSettings(window.localStorage));
  registerServiceWorker();
  return { store: await openBrowserHabitStore(), platform: {} };
}

openApp().then(
  ({ store, platform }) =>
    root.render(
      <StrictMode>
        <HabitStoreProvider store={store}>
          <App platform={platform} />
        </HabitStoreProvider>
      </StrictMode>,
    ),
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
