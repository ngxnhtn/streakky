import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Board } from "./Board.tsx";
import { StoreProvider } from "./store.tsx";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      <Board />
    </StoreProvider>
  </StrictMode>,
);
