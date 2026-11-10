import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { File, Paths } from "expo-file-system";

import { useAuth } from "@/features/auth/auth-provider";

/**
 * Remembered filters. A drop-in for `useState` whose value is kept in a small
 * file on the phone, per signed-in user and per screen, so filters, search
 * text, sorting and tabs survive leaving the screen and closing the app until
 * the person resets them. Nothing is cleared on sign-out.
 */

type Store = Record<string, unknown>;

const FILE_NAME = "saved-filters.json";
let store: Store | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

function file() {
  return new File(Paths.document, FILE_NAME);
}

function loadStore(): Store {
  if (store) return store;
  try {
    const f = file();
    const parsed: unknown = f.exists ? JSON.parse(f.textSync()) : {};
    store = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Store) : {};
  } catch {
    // Unreadable file: start over.
    store = {};
  }
  return store;
}

function saveSoon() {
  if (writeTimer) clearTimeout(writeTimer);
  // Typing in a search box changes the value on every key: write once it settles.
  writeTimer = setTimeout(() => {
    writeTimer = null;
    try {
      const f = file();
      if (!f.exists) f.create();
      f.write(JSON.stringify(store ?? {}));
    } catch {
      // Storage full or unavailable: the filter still works until the app closes.
    }
  }, 400);
}

function storageKey(userId: string, key: string) {
  return `${userId}:${key}`;
}

function read(fullKey: string): { found: boolean; value: unknown } {
  const all = loadStore();
  return fullKey in all ? { found: true, value: all[fullKey] } : { found: false, value: undefined };
}

function write(fullKey: string, value: unknown) {
  const all = loadStore();
  if (value === undefined) {
    if (!(fullKey in all)) return;
    delete all[fullKey];
  } else {
    if (JSON.stringify(all[fullKey]) === JSON.stringify(value)) return;
    all[fullKey] = value;
  }
  saveSoon();
}

export interface PersistOptions<T> {
  /**
   * When true the stored value is ignored and replaced by `initial` — used when
   * a link opens the screen with its own filter, which then becomes the saved one.
   */
  override?: boolean;
  /** Turn the stored JSON back into a value; return `undefined` to fall back to `initial`. */
  revive?: (raw: unknown) => T | undefined;
}

/** Does a stored value have the same basic shape as the default? Guards against stale entries. */
function sameShape(value: unknown, initial: unknown): boolean {
  if (initial === null || initial === undefined) return true;
  if (Array.isArray(initial)) return Array.isArray(value);
  if (typeof initial === "object") return typeof value === "object" && value !== null && !Array.isArray(value);
  return typeof value === typeof initial;
}

export function usePersistedState<T>(
  key: string,
  initial: T | (() => T),
  options: PersistOptions<T> = {},
): [T, Dispatch<SetStateAction<T>>] {
  const userId = useAuth().user?.id ?? "anon";
  const fullKey = storageKey(userId, key);

  function load(): T {
    const fallback = typeof initial === "function" ? (initial as () => T)() : initial;
    if (options.override) return fallback;
    const { found, value } = read(fullKey);
    if (!found) return fallback;
    if (options.revive) {
      const revived = options.revive(value);
      return revived === undefined ? fallback : revived;
    }
    if (!sameShape(value, fallback)) return fallback;
    // Objects: start from the defaults so fields added later still get a value.
    if (fallback && typeof fallback === "object" && !Array.isArray(fallback) && !(fallback instanceof Date)) {
      return { ...fallback, ...(value as object) } as T;
    }
    return value as T;
  }

  const [entry, setEntry] = useState(() => ({ key: fullKey, value: load() }));
  let current = entry;
  // Signed-in user changed under the same screen: load their own filters.
  if (entry.key !== fullKey) {
    current = { key: fullKey, value: load() };
    setEntry(current);
  }

  const setState = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    setEntry((prev) => ({
      key: prev.key,
      value: typeof action === "function" ? (action as (value: T) => T)(prev.value) : action,
    }));
  }, []);

  useEffect(() => {
    write(current.key, current.value instanceof Date ? current.value.toISOString() : current.value);
  }, [current.key, current.value]);

  return [current.value, setState];
}

/** For a remembered `Date`: stored as an ISO string. */
export function reviveDate(raw: unknown): Date | undefined {
  if (typeof raw !== "string") return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
