import { describe, it, expect, beforeEach } from 'vitest';
import { AuthUseCases } from '../../src/modules/auth/application/use-cases/auth.use-cases';
import { IUserRepository, CreateUserData } from '../../src/modules/auth/domain/repositories/user.repository.interface';
import { IPasswordHasher } from '../../src/modules/auth/domain/services/password-hasher.interface';
import { ITokenService, TokenPayload } from '../../src/modules/auth/domain/services/token-service.interface';
import { UserEntity } from '../../src/modules/auth/domain/entities/user.entity';
import { ConflictError, UnauthorizedError } from '../../src/shared/errors/AppError';
import { BcryptPasswordHasher } from '../../src/modules/auth/infrastructure/services/bcrypt-password-hasher';
import { JwtTokenService } from '../../src/modules/auth/infrastructure/services/jwt-token-service';

class InMemoryUserRepository implements IUserRepository {
  private users: UserEntity[] = [];

  public async findByEmail(email: string): Promise<UserEntity | null> {
    const user = this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return user || null;
  }

  public async findById(id: string): Promise<UserEntity | null> {
    const user = this.users.find((u) => u.id === id);
    return user || null;
  }

  public async create(data: CreateUserData): Promise<UserEntity> {
    const user = new UserEntity(
      `uuid-${this.users.length + 1}`,
      data.companyName,
      data.email,
      data.password,
      new Date()
    );
    this.users.push(user);
    return user;
  }
}

describe('Auth Services & UseCases Unit Tests', () => {
  describe('BcryptPasswordHasher', () => {
    const hasher = new BcryptPasswordHasher(10);

    it('should hash a password and verify matching plain text', async () => {
      const plain = 'SecurePassword123!';
      const hash = await hasher.hash(plain);

      expect(hash).not.toBe(plain);
      expect(hash).toMatch(/^\$2[aby]\$/);

      const isValid = await hasher.compare(plain, hash);
      expect(isValid).toBe(true);

      const isInvalid = await hasher.compare('WrongPassword!', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('JwtTokenService', () => {
    const secret = 'test-secret-key-12345678901234567890';
    const jwtService = new JwtTokenService(secret, '1h');

    it('should sign and verify valid JWT tokens', () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        email: 'procurement@acme.com',
        companyName: 'Acme Corp',
      };

      const token = jwtService.generateToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const verified = jwtService.verifyToken(token);
      expect(verified.userId).toBe(payload.userId);
      expect(verified.email).toBe(payload.email);
      expect(verified.companyName).toBe(payload.companyName);
    });

    it('should reject forged or corrupted tokens', () => {
      expect(() => jwtService.verifyToken('invalid.token.here')).toThrow(UnauthorizedError);
    });
  });

  describe('AuthUseCases', () => {
    let repo: InMemoryUserRepository;
    let hasher: IPasswordHasher;
    let tokenService: ITokenService;
    let useCases: AuthUseCases;

    beforeEach(() => {
      repo = new InMemoryUserRepository();
      hasher = new BcryptPasswordHasher(10);
      tokenService = new JwtTokenService('test-secret-min-32-chars-long-abcde', '1h');
      useCases = new AuthUseCases(repo, hasher, tokenService);
    });

    it('should successfully register a new user and return safe user with token', async () => {
      const result = await useCases.register({
        companyName: 'Acme Industries',
        email: 'buyer@acme.com',
        password: 'Password123!',
      });

      expect(result.user.id).toBeDefined();
      expect(result.user.companyName).toBe('Acme Industries');
      expect(result.user.email).toBe('buyer@acme.com');
      // Password must never be exposed on safe object
      expect('password' in result.user).toBe(false);
      expect(result.token).toBeDefined();

      // Ensure password was hashed in repository
      const savedUser = await repo.findByEmail('buyer@acme.com');
      expect(savedUser).not.toBeNull();
      expect(savedUser!.password).not.toBe('Password123!');
      expect(await hasher.compare('Password123!', savedUser!.password)).toBe(true);
    });

    it('should reject registration if email is already registered', async () => {
      await useCases.register({
        companyName: 'Acme Industries',
        email: 'duplicate@acme.com',
        password: 'Password123!',
      });

      await expect(
        useCases.register({
          companyName: 'Another Corp',
          email: 'duplicate@acme.com',
          password: 'Password123!',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should successfully log in an existing user with correct credentials', async () => {
      await useCases.register({
        companyName: 'Acme Industries',
        email: 'buyer@acme.com',
        password: 'Password123!',
      });

      const result = await useCases.login({
        email: 'buyer@acme.com',
        password: 'Password123!',
      });

      expect(result.user.email).toBe('buyer@acme.com');
      expect(result.token).toBeDefined();
    });

    it('should fail login if password does not match', async () => {
      await useCases.register({
        companyName: 'Acme Industries',
        email: 'buyer@acme.com',
        password: 'Password123!',
      });

      await expect(
        useCases.login({
          email: 'buyer@acme.com',
          password: 'IncorrectPassword',
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should fail login if email is not found', async () => {
      await expect(
        useCases.login({
          email: 'unknown@acme.com',
          password: 'Password123!',
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });
});
