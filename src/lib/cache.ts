// Simple in-memory cache with TTL for API responses
// Cache version changes with each deployment to invalidate stale data
const CACHE_VERSION = Date.now().toString(36);

interface CacheEntry<T> {
  data: T;
  expiry: number;
  version: string;
}

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    // Invalidate if expired OR from different deployment
    if (Date.now() > entry.expiry || entry.version !== CACHE_VERSION) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    this.store.set(key, {
      data,
      expiry: Date.now() + (ttlMs ?? this.defaultTTL),
      version: CACHE_VERSION,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  // Get size for debugging
  size(): number {
    return this.store.size;
  }
}

// Singleton instance
export const cache = new Cache();

// Helper to wrap async functions with caching
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs?: number
): Promise<T> {
  const existing = cache.get<T>(key);
  if (existing !== null) {
    return existing;
  }

  const result = await fn();
  cache.set(key, result, ttlMs);
  return result;
}

// Timeout wrapper for promises
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch {
    clearTimeout(timeoutId!);
    return fallback;
  }
}

// Run multiple promises with individual timeouts, return results even if some fail
export async function fetchAllWithTimeout<T>(
  promises: Array<{ key: string; promise: Promise<T>; fallback: T }>,
  timeoutMs: number = 10000
): Promise<Map<string, T>> {
  const results = new Map<string, T>();

  await Promise.all(
    promises.map(async ({ key, promise, fallback }) => {
      try {
        const result = await withTimeout(promise, timeoutMs, fallback);
        results.set(key, result);
      } catch {
        results.set(key, fallback);
      }
    })
  );

  return results;
}
