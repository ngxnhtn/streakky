import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { applyAppearance } from "./appearance.ts";
import { registerServiceWorker } from "./service-worker.ts";
import { openBrowserHabitStore } from "./store/browser.ts";
import { readSettings } from "./store/habit-store.ts";
import { HabitStoreProvider } from "./store/react.tsx";
import "./fonts.css";
import "./styles.css";

// before the database opens, so a dark theme never starts as a light page
applyAppearance(readSettings(window.localStorage));
registerServiceWorker();

const root = createRoot(document.getElementById("root")!);

openBrowserHabitStore().then(
  (store) =>
    root.render(
      <StrictMode>
        <HabitStoreProvider store={store}>
          <App />
        </HabitStoreProvider>
      </StrictMode>,
    ),
  (error: unknown) => {
    console.error(error);
    root.render(
      <main className="mx-auto max-w-[26.25rem] px-6 py-16 text-foreground">
        <h1 className="text-xl font-medium">Streakky can't open its storage</h1>
        <p className="mt-2 text-muted-foreground">
          This browser won't let the app keep data on this device. Try an up-to-date Chrome, Edge,
          Firefox or Safari, outside private browsing.
        </p>
      </main>,
    );
  },
);
