import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config/env';
import { prisma } from './config/database';
import { errorHandler } from './shared/middleware/errorHandler';

// Auth Module
import { PrismaUserRepository } from './modules/auth/infrastructure/repositories/prisma-user.repository';
import { BcryptPasswordHasher } from './modules/auth/infrastructure/services/bcrypt-password-hasher';
import { JwtTokenService } from './modules/auth/infrastructure/services/jwt-token-service';
import { AuthUseCases } from './modules/auth/application/use-cases/auth.use-cases';
import { AuthController } from './modules/auth/presentation/controllers/auth.controller';
import { createAuthRouter } from './modules/auth/presentation/routes/auth.routes';
import { createAuthMiddleware } from './shared/middleware/auth.middleware';

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

  // Security and base middlewares
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
  app.use(cookieParser());

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'quotewise-backend',
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  // Dependency Inversion: Auth Module
  const userRepository = new PrismaUserRepository(prisma);
  const passwordHasher = new BcryptPasswordHasher(12);
  const tokenService = new JwtTokenService(config.JWT_SECRET, config.JWT_EXPIRES_IN);

  const authUseCases = new AuthUseCases(userRepository, passwordHasher, tokenService);
  const authController = new AuthController(authUseCases, {
    name: config.COOKIE_NAME,
    isProduction: config.NODE_ENV === 'production',
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  });
  const authMiddleware = createAuthMiddleware(tokenService, config.COOKIE_NAME);

  // Dependency Inversion: RFQ & Quotation Modules
  const rfqRepository = new PrismaRFQRepository(prisma);
  const quotationRepository = new PrismaQuotationRepository(prisma);

  const rfqUseCases = new RFQUseCases(rfqRepository, quotationRepository);
  const quotationUseCases = new QuotationUseCases(quotationRepository);

  const rfqController = new RFQController(rfqUseCases);
  const quotationController = new QuotationController(quotationUseCases);

  // Routes
  const authRouter = createAuthRouter(authController, authMiddleware);
  app.use('/api/auth', authRouter);
  app.use('/api/v1/auth', authRouter);

  app.use('/api/rfqs', createRfqRouter(rfqController, quotationController, authMiddleware));
  app.use('/api/quotations', createQuotationRouter(quotationController));

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
};

export default createApp;
