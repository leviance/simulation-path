"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

// SSR still provides the explanation/readout. Controls become usable only after
// this client boundary hydrates, so an early click is not silently discarded.
export function useClientReady() {
  return useSyncExternalStore(subscribe, clientReady, serverReady);
}
