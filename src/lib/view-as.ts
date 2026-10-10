import { useSyncExternalStore } from "react";

/**
 * "View as agent": while set, read requests carry `X-View-As` so the API
 * answers as that agent, and the app blocks changes (the API rejects them
 * too). Same as the website (client/lib/view-as.ts). Kept in memory only:
 * restarting the app ends it.
 */
export interface ViewAsTarget {
  id: string;
  name: string;
}

let current: ViewAsTarget | null = null;
const listeners = new Set<() => void>();

export function getViewAs() {
  return current;
}

export function setViewAs(target: ViewAsTarget | null) {
  current = target;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** The agent being viewed, or null. */
export function useViewAsTarget() {
  return useSyncExternalStore(subscribe, getViewAs, getViewAs);
}
