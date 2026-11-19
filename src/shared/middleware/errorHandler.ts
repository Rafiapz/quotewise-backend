import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError, ValidationError } from '../errors/AppError';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Handle Prisma Database Connection / Authentication Errors
  if (err instanceof Prisma.PrismaClientInitializationError) {
    logger.error('Prisma Database Connection / Authentication Error:', err.message);
    res.status(503).json({
      success: false,
      message:
        'Database connection failed. Please ensure PostgreSQL is running and DATABASE_URL in .env contains valid credentials.',
      detail: process.env.NODE_ENV === 'production' ? undefined : err.message,
    });
    return;
  }

  // Handle Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target)
        ? (err.meta.target as string[]).join(', ')
        : 'field';
      res.status(409).json({
        success: false,
        message: `A record with this ${target} already exists`,
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'The requested database record was not found',
      });
      return;
    }

    if (err.code === 'P2021') {
      res.status(500).json({
        success: false,
        message: 'Database tables have not been created yet. Please run `npx prisma db push`.',
      });
      return;
    }
  }

  // Unhandled internal errors
  logger.error('Unhandled internal server error:', err);

  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected internal error occurred'
        : err.message,
  });
};
