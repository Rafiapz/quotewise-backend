import { createApp } from "./app";
import { config } from "./config/env";
import { prisma } from "./config/database";
import { disconnectRedis } from "./config/redis";
import { logger } from "./shared/utils/logger";

const app = createApp();

const server = app.listen(config.PORT, () => {
  logger.info(`QuoteWise Backend server running on http://localhost:${config.PORT}`);
});

const gracefulShutdown = async () => {
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (err) {
      logger.error('Error during Prisma disconnect:', err);
    }
    try {
      await disconnectRedis();
    } catch (err) {
      logger.error('Error during Redis disconnect:', err);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown());
process.on('SIGINT', () => gracefulShutdown());
