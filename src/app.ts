import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import { prisma } from './config/database';
import { errorHandler } from './shared/middleware/errorHandler';

// RFQ Module
import { PrismaRFQRepository } from './modules/rfq/infrastructure/repositories/prisma-rfq.repository';
import { RFQUseCases } from './modules/rfq/application/use-cases/rfq.use-cases';
import { RFQController } from './modules/rfq/presentation/controllers/rfq.controller';
import { createRfqRouter } from './modules/rfq/presentation/routes/rfq.routes';

// Quotation Module
import { PrismaQuotationRepository } from './modules/quotation/infrastructure/repositories/prisma-quotation.repository';
import { QuotationUseCases } from './modules/quotation/application/use-cases/quotation.use-cases';
import { QuotationController } from './modules/quotation/presentation/controllers/quotation.controller';
import { createQuotationRouter } from './modules/quotation/presentation/routes/quotation.routes';

export const createApp = (): Application => {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: [config.FRONTEND_URL, 'http://localhost:5173'],
      credentials: true,
    })
  );

  if (config.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'quotewise-backend',
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  // Dependency Inversion
  const rfqRepository = new PrismaRFQRepository(prisma);
  const quotationRepository = new PrismaQuotationRepository(prisma);

  const rfqUseCases = new RFQUseCases(rfqRepository);
  const quotationUseCases = new QuotationUseCases(quotationRepository);

  const rfqController = new RFQController(rfqUseCases);
  const quotationController = new QuotationController(quotationUseCases);

  // Routes
  app.use('/api/rfqs', createRfqRouter(rfqController, quotationController));
  app.use('/api/quotations', createQuotationRouter(quotationController));

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
};

export default createApp;
