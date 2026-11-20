import Redis from "ioredis";
import { ICacheService } from "../../domain/services/cache.service.interface";
import { logger } from "../../utils/logger";

export interface RedisCacheServiceConstructorParams {
  Redis: Redis | null;
}

export class RedisCacheService implements ICacheService {
  private redis: Redis | null;
  private defaultTTL = 600; // 10 minutes default

  constructor({
    Redis,
  }: RedisCacheServiceConstructorParams) {
    this.redis = Redis;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`[CACHE ERROR] get "${key}":`, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.redis) return;

    try {
      const serialized = JSON.stringify(value);
      const ttl = ttlSeconds !== undefined ? ttlSeconds : this.defaultTTL;

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
    if (!this.redis) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error(`[CACHE ERROR] del "${key}":`, error);
    }
  }

  async delByPattern(pattern: string): Promise<void> {
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
    if (!this.redis) return;

    try {
      await this.redis.flushdb();
    } catch (error) {
      logger.error("[CACHE ERROR] flush:", error);
    }
  }
}
