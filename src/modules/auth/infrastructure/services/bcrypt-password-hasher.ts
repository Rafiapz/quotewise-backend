import bcrypt from 'bcrypt';
import { IPasswordHasher } from '../../domain/services/password-hasher.interface';

export class BcryptPasswordHasher implements IPasswordHasher {
  private saltRounds: number;

  constructor(saltRounds?: number) {
    this.saltRounds = typeof saltRounds === "number" ? saltRounds : 12;
  }

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
