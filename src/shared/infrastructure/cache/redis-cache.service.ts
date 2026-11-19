import { ICacheService } from '../../domain/services/cache.service.interface';
import { getRedisClient, isRedisReady } from '../../../config/redis';
import { logger } from '../../utils/logger';

export class RedisCacheService implements ICacheService {
  private readonly defaultTtl: number;

  constructor(defaultTtlSeconds: number = 60) {
    this.defaultTtl = defaultTtlSeconds;
  }

  public isAvailable(): boolean {
    return isRedisReady();
  }

  public async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    if (!client || !this.isAvailable()) {
      return null;
    }

    try {
      const data = await client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.warn(`Redis get failed for key "${key}":`, error);
      return null;
    }
  }

  public async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const client = getRedisClient();
    if (!client || !this.isAvailable()) {
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      const ttl = ttlSeconds ?? this.defaultTtl;
      if (ttl > 0) {
        await client.set(key, serialized, 'EX', ttl);
      } else {
        await client.set(key, serialized);
      }
    } catch (error) {
      logger.warn(`Redis set failed for key "${key}":`, error);
    }
  }

  public async del(key: string): Promise<void> {
    const client = getRedisClient();
    if (!client || !this.isAvailable()) {
      return;
    }

    try {
      await client.del(key);
    } catch (error) {
      logger.warn(`Redis del failed for key "${key}":`, error);
    }
  }

  public async delByPattern(pattern: string): Promise<void> {
    const client = getRedisClient();
    if (!client || !this.isAvailable()) {
      return;
    }

    try {
      const stream = client.scanStream({
        match: pattern,
        count: 50,
      });

      const keysToDelete: string[] = [];

      stream.on('data', (resultKeys: string[]) => {
        for (const k of resultKeys) {
          keysToDelete.push(k);
        }
      });

      await new Promise<void>((resolve, reject) => {
        stream.on('end', async () => {
          try {
            if (keysToDelete.length > 0) {
              const pipeline = client.pipeline();
              for (const key of keysToDelete) {
                pipeline.del(key);
              }
              await pipeline.exec();
            }
            resolve();
          } catch (err) {
            reject(err);
          }
        });
        stream.on('error', (err) => reject(err));
      });
    } catch (error) {
      logger.warn(`Redis delByPattern failed for pattern "${pattern}":`, error);
    }
  }
}
