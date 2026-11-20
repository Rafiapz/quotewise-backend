import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { AwilixContainer } from "awilix";
import { config } from "./config/env";
import { errorHandler } from "./shared/middleware/errorHandler";
import { createAppContainer, AppCradle } from "./container";
import { createAuthRouter } from "./modules/auth/presentation/routes/auth.routes";
import { createRfqRouter } from "./modules/rfq/presentation/routes/rfq.routes";
import { createQuotationRouter } from "./modules/quotation/presentation/routes/quotation.routes";

/**
 * Creates and configures the Express application.
 * Accepts an optional AwilixContainer for dependency inversion and test mocking.
 */
export const createApp = (
  container: AwilixContainer<AppCradle> = createAppContainer(),
): Application => {
  const app = express();

  // Trust first proxy (e.g. Render, Railway, Vercel, AWS ALB, Nginx)
  app.set("trust proxy", 1);

  const {
    AuthController,
    RFQController,
    QuotationController,
    AuthMiddleware,
  } = container.cradle;

  // Security and base middlewares
  app.use(helmet());

  const allowedOrigins = Array.from(
    new Set([
      config.FRONTEND_URL,
      config.FRONTEND_URL.replace(/\/$/, ""),
      "http://localhost:5173",
      "http://localhost:3000",
    ]),
  );

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );

  app.use(express.json());
  app.use(cookieParser());

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      service: "quotewise-backend",
      timestamp: new Date().toISOString(),
    });
  });

  // Mount Feature Routes
  const authRouter = createAuthRouter(AuthController, AuthMiddleware);
  app.use("/api/auth", authRouter);
  app.use("/api/v1/auth", authRouter);

  app.use(
    "/api/rfqs",
    createRfqRouter(RFQController, QuotationController, AuthMiddleware),
  );
  app.use(
    "/api/quotations",
    createQuotationRouter(QuotationController),
  );

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
};

export default createApp;
