import { useCallback, useEffect, useRef, useState } from "react";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

interface UseCachedFetchOptions {
  ttlMs?: number;
  enabled?: boolean;
}

/**
 * Lightweight in-memory TTL cache + fetch hook (Phase 13). Deduplicates
 * repeated reads of slow-changing data (catalog, analytics) across page
 * navigations within a session without pulling in a full data-fetching
 * library — swap for React Query later if request complexity grows.
 */
export function useCachedFetch<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  { ttlMs = 60_000, enabled = true }: UseCachedFetchOptions = {}
) {
  const [data, setData] = useState<T | null>(() => {
    if (!key) return null;
    const cached = cache.get(key);
    return cached && cached.expiresAt > Date.now() ? (cached.data as T) : null;
  });
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(async () => {
    if (!key || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      cache.set(key, { data: result, expiresAt: Date.now() + ttlMs });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [key, enabled, ttlMs]);

  useEffect(() => {
    if (!key || !enabled) return;
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      setData(cached.data as T);
      setLoading(false);
      return;
    }
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return { data, loading, error, refetch };
}

export function invalidateCache(keyPrefix?: string) {
  if (!keyPrefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) cache.delete(key);
  }
}
