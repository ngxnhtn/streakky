import { createContext, useContext } from "react";

/** Phones open dialogs as bottom sheets; the web opens them in the middle. */
export type DialogShape = { shape: "sheet" | "center"; className?: string };

export const ShapeContext = createContext<DialogShape>({ shape: "sheet" });
export const useDialogShape = () => useContext(ShapeContext);
