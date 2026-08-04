import { useCallback, useState } from "react";

/** Reusable localStorage-backed state hook (Phase 13). */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = next instanceof Function ? next(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // storage full/unavailable — state still updates in-memory
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, set] as const;
}
