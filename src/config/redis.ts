import Redis, { Redis as RedisClient } from 'ioredis';
import { config } from './env';
import { logger } from '../shared/utils/logger';

let redisClient: RedisClient | null = null;
let isConnected = false;

export const initRedis = (): RedisClient | null => {
  if (!config.REDIS_URL) {
    logger.warn('REDIS_URL is not defined in environment variables. Caching will be disabled.');
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    const isTls = config.REDIS_URL.startsWith('rediss://');

    redisClient = new Redis(config.REDIS_URL, {
      tls: isTls ? { rejectUnauthorized: false } : undefined,
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      lazyConnect: false,
      retryStrategy: (times) => {
        if (times > 5) {
          logger.warn('Redis reconnection limit reached. Operating in fail-open cache mode.');
          return null; // Stop retrying
        }
        return Math.min(times * 500, 2000);
      },
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis');
    });

    redisClient.on('ready', () => {
      isConnected = true;
      logger.info('Redis connection is ready for caching operations');
    });

    redisClient.on('error', (err: Error) => {
      isConnected = false;
      logger.warn(`Redis connection warning: ${err.message}. Cache operations will bypass safely.`);
    });

    redisClient.on('close', () => {
      isConnected = false;
    });

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis client:', error);
    redisClient = null;
    isConnected = false;
    return null;
  }
};

export const getRedisClient = (): RedisClient | null => {
  if (!redisClient && config.REDIS_URL) {
    return initRedis();
  }
  return redisClient;
};

export const isRedisReady = (): boolean => {
  return isConnected && redisClient !== null && redisClient.status === 'ready';
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis client disconnected cleanly');
    } catch {
      redisClient.disconnect();
    } finally {
      redisClient = null;
      isConnected = false;
    }
  }
};
