import Redis from "ioredis";
import { ICacheService } from "../../domain/services/cache.service.interface";
import { logger } from "../../utils/logger";

export interface RedisCacheServiceConstructorParams {
  Redis: Redis | null;
}

interface CacheEntry {
  value: any;
  expiry: number;
}

export class RedisCacheService implements ICacheService {
  private redis: Redis | null;
  private defaultTTL = 600; // 10 minutes default
  private memoryCache = new Map<string, CacheEntry>();

  constructor({
    Redis,
  }: RedisCacheServiceConstructorParams) {
    this.redis = Redis;
  }

  async get<T>(key: string): Promise<T | null> {
    // 1. Fast in-memory L1 cache
    const mem = this.memoryCache.get(key);
    if (mem) {
      if (mem.expiry > Date.now()) {
        return mem.value as T;
      }
      this.memoryCache.delete(key);
    }

    if (!this.redis) return null;

    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      const parsed = JSON.parse(data) as T;
      this.memoryCache.set(key, { value: parsed, expiry: Date.now() + 60000 }); // 60s L1 cache
      return parsed;
    } catch (error) {
      logger.error(`[CACHE ERROR] get "${key}":`, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds !== undefined ? ttlSeconds : this.defaultTTL;
    this.memoryCache.set(key, { value, expiry: Date.now() + ttl * 1000 });

    if (!this.redis) return;

    try {
      const serialized = JSON.stringify(value);
      if (ttl > 0) {
        await this.redis.set(key, serialized, "EX", ttl);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      logger.error(`[CACHE ERROR] set "${key}":`, error);
    }
  }

  async del(key: string): Promise<void> {
    this.memoryCache.delete(key);

    if (!this.redis) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error(`[CACHE ERROR] del "${key}":`, error);
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }

    if (!this.redis) return;

    try {
      let cursor = "0";
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== "0");
    } catch (error) {
      logger.error(`[CACHE ERROR] delByPattern "${pattern}":`, error);
    }
  }

  async has(key: string): Promise<boolean> {
    const mem = this.memoryCache.get(key);
    if (mem && mem.expiry > Date.now()) return true;

    if (!this.redis) return false;

    try {
      const count = await this.redis.exists(key);
      return count > 0;
    } catch (error) {
      logger.error(`[CACHE ERROR] has "${key}":`, error);
      return false;
    }
  }

  async flush(): Promise<void> {
    this.memoryCache.clear();

    if (!this.redis) return;

    try {
      await this.redis.flushdb();
    } catch (error) {
      logger.error("[CACHE ERROR] flush:", error);
    }
  }
}
