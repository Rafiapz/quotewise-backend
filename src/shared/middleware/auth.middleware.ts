import { Request, Response, NextFunction } from 'express';
import { ITokenService } from '../../modules/auth/domain/services/token-service.interface';
import { UnauthorizedError } from '../errors/AppError';

export const createAuthMiddleware = (
  tokenService: ITokenService,
  cookieName: string
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const cookieHeader = req.cookies as Record<string, string | undefined> | undefined;
      const cookieToken = cookieHeader ? cookieHeader[cookieName] : undefined;

      const authHeader = req.headers.authorization;
      const bearerToken = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : undefined;

      const token = cookieToken || bearerToken;

      if (!token) {
        throw new UnauthorizedError('Authentication token missing. Please sign in.');
      }

      const payload = tokenService.verifyToken(token);
      req.user = payload;
      next();
    } catch (error) {
      next(error);
    }
  };
};
