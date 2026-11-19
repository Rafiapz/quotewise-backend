import { createApp } from "./app";
import { config } from "./config/env";
import { prisma } from "./config/database";
import { disconnectRedis } from "./config/redis";
import { logger } from "./shared/utils/logger";

const app = createApp();

const server = app.listen(config.PORT, () => {
  logger.info(
    `QuoteWise Backend server running on http://localhost:${config.PORT}`,
  );
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info(`Allowed CORS origin: ${config.FRONTEND_URL}`);
});

const gracefulShutdown = async (signal: string) => {
  logger.info(
    `${signal} signal received: closing HTTP server and disconnecting Prisma & Redis`,
  );
  server.close(async () => {
    logger.info("HTTP server closed");
    try {
      await prisma.$disconnect();
      logger.info("Prisma disconnected successfully");
    } catch (err) {
      logger.error("Error during Prisma disconnect:", err);
    }
    try {
      await disconnectRedis();
    } catch (err) {
      logger.error("Error during Redis disconnect:", err);
    }
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
