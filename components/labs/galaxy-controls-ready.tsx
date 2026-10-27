import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export default function GalaxyControlsReady({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  return (
    <fieldset
      disabled={!ready}
      data-galaxy-controls-ready={ready ? "true" : "false"}
      aria-label="Điều khiển thiên hà"
      style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
    >
      {children}
    </fieldset>
  );
}
