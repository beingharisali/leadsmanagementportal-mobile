import { useState } from "react";

/**
 * Editable copy of a settings list (stages, sources, fields). Each row gets a
 * local `id` so new rows (no key yet) can be reordered and removed too.
 */
export function useDraftList<T extends { key?: string }>(initial: T[]) {
  const [items, setItems] = useState(() => initial.map((item) => ({ ...item, id: item.key ?? newId() })));

  return {
    items,
    reset: (next: T[]) => setItems(next.map((item) => ({ ...item, id: item.key ?? newId() }))),
    add: (item: T) => setItems((list) => [...list, { ...item, id: newId() }]),
    update: (id: string, patch: Partial<T>) =>
      setItems((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item))),
    remove: (id: string) => setItems((list) => list.filter((item) => item.id !== id)),
    move: (id: string, by: -1 | 1) =>
      setItems((list) => {
        const index = list.findIndex((item) => item.id === id);
        const target = index + by;
        if (index < 0 || target < 0 || target >= list.length) return list;
        const next = [...list];
        [next[index], next[target]] = [next[target]!, next[index]!];
        return next;
      }),
  };
}

function newId() {
  return `new-${Math.random().toString(36).slice(2, 10)}`;
}

/** Strips the local ids before sending a list to the API. */
export function withoutIds<T extends { id: string }>(items: T[]): Omit<T, "id">[] {
  return items.map((item) => {
    const copy: Partial<T> = { ...item };
    delete copy.id;
    return copy as Omit<T, "id">;
  });
}

/** Labels must be filled in and unique (case-insensitive). Returns the first problem. */
export function labelProblem(labels: string[], what: string) {
  const trimmed = labels.map((l) => l.trim());
  if (trimmed.some((l) => !l)) return `Every ${what} needs a name.`;
  const seen = new Set<string>();
  for (const label of trimmed) {
    const key = label.toLowerCase();
    if (seen.has(key)) return `Two ${what}s are called "${label}".`;
    seen.add(key);
  }
  return null;
}
