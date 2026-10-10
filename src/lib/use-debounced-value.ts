import { useEffect, useState } from "react";

/** `value`, once it has stopped changing for `delayMs` (e.g. a search box). */
export function useDebouncedValue<T>(value: T, delayMs = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
