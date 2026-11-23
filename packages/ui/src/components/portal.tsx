import * as React from "react";

/**
 * Where dialogs and sheets render. By default the document body; an app shell (a phone frame
 * in a demo, a scoped panel) can point them at its own element so they stay inside it and
 * inherit its theme.
 */
const PortalContainerContext = React.createContext<HTMLElement | null>(null);

export function PortalContainerProvider({
  container,
  children,
}: {
  container: HTMLElement | null;
  children: React.ReactNode;
}) {
  return (
    <PortalContainerContext.Provider value={container}>{children}</PortalContainerContext.Provider>
  );
}

export function usePortalContainer(): HTMLElement | undefined {
  return React.useContext(PortalContainerContext) ?? undefined;
}
