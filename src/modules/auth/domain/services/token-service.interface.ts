export interface TokenPayload {
  userId: string;
  email: string;
  companyName: string;
}

export interface ITokenService {
  generateToken(payload: TokenPayload): string;
  verifyToken(token: string): TokenPayload;
}
