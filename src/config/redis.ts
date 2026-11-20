import Redis, { RedisOptions } from "ioredis";
import { config } from "./env";
import { logger } from "../shared/utils/logger";

let redisInstance: Redis | null = null;

export const createRedisClient = (): Redis | null => {
  const redisUrl = config.REDIS_URL;

  if (!redisUrl) {
    logger.warn(
      "[CACHE] REDIS_URL not configured. Cache will operate in fallback / pass-through mode.",
    );
    return null;
  }

  try {
    const options: RedisOptions = {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        if (times > 5) {
          logger.warn(
            `[CACHE] Redis connection retry limit reached (${times} attempts). Stopping reconnect.`,
          );
          return null; // Stop retrying
        }
        const delay = Math.min(times * 200, 2000);
        return delay;
      },
    };

    const client = new Redis(redisUrl, options);

    client.on("connect", () => {
      logger.info("[CACHE] Connected to Redis server");
    });

    client.on("ready", () => {
      logger.info("[CACHE] Redis client is ready");
    });

    client.on("error", (err) => {
      logger.error("[CACHE ERROR] Redis connection error:", err.message);
    });

    client.on("close", () => {
      logger.warn("[CACHE] Redis connection closed");
    });

    return client;
  } catch (error) {
    logger.error("[CACHE ERROR] Failed to initialize Redis client:", error);
    return null;
  }
};

export const getRedisClient = (): Redis | null => {
  if (!redisInstance && config.REDIS_URL) {
    redisInstance = createRedisClient();
  }
  return redisInstance;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisInstance) {
    try {
      await redisInstance.quit();
      logger.info("[CACHE] Redis disconnected gracefully");
    } catch (err) {
      logger.error("[CACHE ERROR] Error during Redis disconnect:", err);
      redisInstance.disconnect();
    } finally {
      redisInstance = null;
    }
  }
};
