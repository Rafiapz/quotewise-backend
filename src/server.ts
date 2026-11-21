import { createApp } from "./app";
import { config } from "./config/env";
import { prisma } from "./config/database";
import { disconnectRedis } from "./config/redis";
import { logger } from "./shared/utils/logger";

const app = createApp();

const server = app.listen(config.PORT, () => {
  logger.info(`QuoteWise Backend server running on http://localhost:${config.PORT}`);
});

// Configure keep-alive timeouts to prevent connection drops behind reverse proxies (Render, AWS, Nginx)
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

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

// Catch unhandled Promise rejections and uncaught exceptions to prevent silent process crashes
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection detected at process level:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception detected at process level:', error);
  // Ensure graceful shutdown if critical uncaught state occurs
  gracefulShutdown();
});
