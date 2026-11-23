import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { registerServiceWorker } from "./service-worker.ts";
import { openBrowserHabitStore } from "./store/browser.ts";
import { HabitStoreProvider } from "./store/react.tsx";
import "./fonts.css";
import "./styles.css";

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
      <main className="mx-auto max-w-[420px] px-6 py-16 text-foreground">
        <h1 className="text-xl font-medium">Streakky can't open its storage</h1>
        <p className="mt-2 text-muted-foreground">
          This browser won't let the app keep data on this device. Try an up-to-date Chrome, Edge,
          Firefox or Safari, outside private browsing.
        </p>
      </main>,
    );
  },
);
