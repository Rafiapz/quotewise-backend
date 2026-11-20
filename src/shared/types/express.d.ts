import { TokenPayload } from '../../modules/auth/domain/services/token-service.interface';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

