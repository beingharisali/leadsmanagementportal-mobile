import { useSyncExternalStore } from "react";

/**
 * The "upgrade your plan" message, opened from anywhere: the query client
 * shows it when the API refuses something because of the plan (a limit
 * reached, or a feature not included). Same as client/lib/upgrade-prompt.ts.
 */
export interface UpgradePrompt {
  message: string;
  /** What hit the limit or which feature is missing, as the API sent it */
  details?: Record<string, unknown>;
}

let current: UpgradePrompt | null = null;
const listeners = new Set<() => void>();

export function showUpgradePrompt(prompt: UpgradePrompt | null) {
  current = prompt;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function useUpgradePrompt() {
  return useSyncExternalStore(subscribe, () => current, () => current);
}
