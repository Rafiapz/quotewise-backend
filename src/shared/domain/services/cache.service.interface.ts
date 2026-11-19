/**
 * Domain Service Interface for Caching.
 * In Clean Architecture, the domain layer defines the abstraction/contract for caching,
 * completely decoupled from infrastructure details (Redis, Memcached, In-Memory, etc.).
 */
export interface ICacheService {
  /**
   * Retrieves a cached item by its key.
   * Returns parsed value or null if not found or expired.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Stores a value in the cache with an optional Time-To-Live (TTL) in seconds.
   */
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;

  /**
   * Deletes a single item by key.
   */
  del(key: string): Promise<void>;

  /**
   * Deletes all keys matching a glob-style pattern (e.g. 'rfqs:*' or 'quotes:rfq-123:*').
   */
  delByPattern(pattern: string): Promise<void>;

  /**
   * Checks if a key exists in cache.
   */
  has(key: string): Promise<boolean>;

  /**
   * Flushes all cached data.
   */
  flush(): Promise<void>;
}
