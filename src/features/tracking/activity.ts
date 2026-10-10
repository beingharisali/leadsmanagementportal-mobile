/**
 * When the person last touched or typed in the app. Read by the presence
 * tracker to tell active from idle time; updated by touches anywhere in the
 * signed-in app and by typing in text fields.
 */
let lastInputAt = Date.now();
const listeners = new Set<() => void>();

export function markInput() {
  const wasStale = Date.now() - lastInputAt > 5_000;
  lastInputAt = Date.now();
  // Coming back from idle should show as active right away (not at the next tick).
  if (wasStale) listeners.forEach((listener) => listener());
}

export function getLastInputAt() {
  return lastInputAt;
}

/** Called (at most every few seconds) when input resumes. */
export function onInputResumed(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
