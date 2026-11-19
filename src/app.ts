import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import { prisma } from './config/database';
import { errorHandler } from './shared/middleware/errorHandler';
import { notFoundHandler } from './shared/middleware/notFoundHandler';

// RFQ Module
import { PrismaRFQRepository } from './modules/rfq/infrastructure/repositories/prisma-rfq.repository';
import {
  CreateRfqUseCase,
  GetRfqListUseCase,
  GetRfqByIdUseCase,
} from './modules/rfq/application/use-cases/rfq.use-cases';
import { RFQController } from './modules/rfq/presentation/controllers/rfq.controller';
import { createRfqRouter } from './modules/rfq/presentation/routes/rfq.routes';

// Quotation Module
import { PrismaQuotationRepository } from './modules/quotation/infrastructure/repositories/prisma-quotation.repository';
import {
  CreateQuotationUseCase,
  GetQuotationsByRfqUseCase,
} from './modules/quotation/application/use-cases/quotation.use-cases';
import { QuotationController } from './modules/quotation/presentation/controllers/quotation.controller';
import { createQuotationRouter } from './modules/quotation/presentation/routes/quotation.routes';

export const createApp = (): Application => {
  const app = express();

  // Security & Utility Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: [config.FRONTEND_URL, 'http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  if (config.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint with database check
  app.get('/api/health', async (_req: Request, res: Response) => {
    let dbStatus = 'healthy';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'disconnected';
    }

    res.status(200).json({
      status: 'ok',
      service: 'quotewise-backend',
      environment: config.NODE_ENV,
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  });

  // Dependency Inversion / Wire Repositories
  const rfqRepository = new PrismaRFQRepository(prisma);
  const quotationRepository = new PrismaQuotationRepository(prisma);

  // Wire Use Cases
  const createRfqUseCase = new CreateRfqUseCase(rfqRepository);
  const getRfqListUseCase = new GetRfqListUseCase(rfqRepository);
  const getRfqByIdUseCase = new GetRfqByIdUseCase(rfqRepository);

  const createQuotationUseCase = new CreateQuotationUseCase(quotationRepository, rfqRepository);
  const getQuotationsByRfqUseCase = new GetQuotationsByRfqUseCase(quotationRepository, rfqRepository);

  // Wire Controllers
  const rfqController = new RFQController(
    createRfqUseCase,
    getRfqListUseCase,
    getRfqByIdUseCase
  );

  const quotationController = new QuotationController(
    createQuotationUseCase,
    getQuotationsByRfqUseCase,
    quotationRepository
  );

  // Register Presentation Routes
  app.use('/api/rfqs', createRfqRouter(rfqController, quotationController));
  app.use('/api/quotations', createQuotationRouter(quotationController));

  // 404 Route Handler
  app.use(notFoundHandler);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
};

export default createApp;
