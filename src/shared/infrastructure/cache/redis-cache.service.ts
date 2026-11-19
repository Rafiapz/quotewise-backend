import Redis from "ioredis";
import { ICacheService } from "../../domain/services/cache.service.interface";
import { logger } from "../../utils/logger";

export class RedisCacheService implements ICacheService {
  constructor(
    private readonly redis: Redis | null,
    private readonly defaultTTL: number = 300, // 5 minutes default
  ) {}

  public async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`RedisCacheService.get error for key "${key}":`, error);
      return null;
    }
  }

  public async set(
    key: string,
    value: unknown,
    ttlSeconds?: number,
  ): Promise<void> {
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
      logger.error(`RedisCacheService.set error for key "${key}":`, error);
    }
  }

  public async del(key: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error(`RedisCacheService.del error for key "${key}":`, error);
    }
  }

  public async delByPattern(pattern: string): Promise<void> {
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
      logger.error(
        `RedisCacheService.delByPattern error for pattern "${pattern}":`,
        error,
      );
    }
  }

  public async has(key: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const count = await this.redis.exists(key);
      return count > 0;
    } catch (error) {
      logger.error(`RedisCacheService.has error for key "${key}":`, error);
      return false;
    }
  }

  public async flush(): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.flushdb();
    } catch (error) {
      logger.error("RedisCacheService.flush error:", error);
    }
  }
}