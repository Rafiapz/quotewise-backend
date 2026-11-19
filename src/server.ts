import { createApp } from './app';
import { config } from './config/env';
import { logger } from './shared/utils/logger';

const app = createApp();

const server = app.listen(config.PORT, () => {
  logger.info(`QuoteWise Backend server running on http://localhost:${config.PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info(`Allowed CORS origin: ${config.FRONTEND_URL}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});
