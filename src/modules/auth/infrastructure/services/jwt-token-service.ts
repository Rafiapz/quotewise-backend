import jwt, { SignOptions } from 'jsonwebtoken';
import { ITokenService, TokenPayload } from '../../domain/services/token-service.interface';
import { UnauthorizedError } from '../../../../shared/errors/AppError';

export class JwtTokenService implements ITokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string | number = '7d'
  ) {}

  public generateToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: this.expiresIn as unknown as SignOptions['expiresIn'],
    };
    return jwt.sign(payload, this.secret, options);
  }

  public verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret);
      if (
        typeof decoded === 'object' &&
        decoded !== null &&
        'userId' in decoded &&
        'email' in decoded &&
        'companyName' in decoded
      ) {
        const payload = decoded as unknown as TokenPayload;
        return {
          userId: String(payload.userId),
          email: String(payload.email),
          companyName: String(payload.companyName),
        };
      }
      throw new UnauthorizedError('Invalid token payload structure');
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid or expired authentication token');
    }
  }
}
