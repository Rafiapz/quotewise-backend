import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { AuthController } from '../../src/modules/auth/presentation/controllers/auth.controller';
import { createAuthRouter } from '../../src/modules/auth/presentation/routes/auth.routes';
import { createAuthMiddleware } from '../../src/shared/middleware/auth.middleware';
import { AuthUseCases } from '../../src/modules/auth/application/use-cases/auth.use-cases';
import { IUserRepository, CreateUserData } from '../../src/modules/auth/domain/repositories/user.repository.interface';
import { UserEntity } from '../../src/modules/auth/domain/entities/user.entity';
import { BcryptPasswordHasher } from '../../src/modules/auth/infrastructure/services/bcrypt-password-hasher';
import { JwtTokenService } from '../../src/modules/auth/infrastructure/services/jwt-token-service';
import { errorHandler } from '../../src/shared/middleware/errorHandler';

class MockUserRepository implements IUserRepository {
  public users: UserEntity[] = [];

  public async findByEmail(email: string): Promise<UserEntity | null> {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  public async findById(id: string): Promise<UserEntity | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  public async create(data: CreateUserData): Promise<UserEntity> {
    const user = new UserEntity(
      `user-uuid-${this.users.length + 1}`,
      data.companyName,
      data.email,
      data.password,
      new Date()
    );
    this.users.push(user);
    return user;
  }
}

describe('Auth API HTTP & Cookie Integration Tests', () => {
  let app: express.Application;
  let mockUserRepo: MockUserRepository;

  beforeEach(() => {
    mockUserRepo = new MockUserRepository();
    const hasher = new BcryptPasswordHasher(10);
    const tokenService = new JwtTokenService('test-secret-key-32-characters-min-abcde', '1h');
    const authUseCases = new AuthUseCases(mockUserRepo, hasher, tokenService);

    const authController = new AuthController(authUseCases, {
      name: 'token',
      isProduction: false,
      maxAgeMs: 7 * 24 * 60 * 60 * 1000,
    });
    const authMiddleware = createAuthMiddleware(tokenService, 'token');

    app = express();
    app.use(express.json());
    app.use(cookieParser());

    app.use('/api/auth', createAuthRouter(authController, authMiddleware));
    app.use(errorHandler);
  });

  it('POST /api/auth/register should create user, return 201 and set HttpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        companyName: 'Acme Procurement',
        email: 'procurement@acme.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('procurement@acme.com');
    expect(res.body.data.user.companyName).toBe('Acme Procurement');
    expect(res.body.data.token).toBeDefined();

    // Verify HttpOnly cookie header
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : String(cookies);
    expect(cookieHeader).toContain('token=');
    expect(cookieHeader.toLowerCase()).toContain('httponly');
  });

  it('POST /api/auth/signup alias should also register successfully', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        companyName: 'Beta Corp',
        email: 'buyer@beta.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('buyer@beta.com');
  });

  it('POST /api/auth/register should fail with 422 if input validation fails', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        companyName: '',
        email: 'invalid-email',
        password: 'short',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('POST /api/auth/login should authenticate existing user and set HttpOnly cookie', async () => {
    // First register
    await request(app)
      .post('/api/auth/register')
      .send({
        companyName: 'Acme Procurement',
        email: 'procurement@acme.com',
        password: 'Password123!',
      });

    // Then login
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'procurement@acme.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('procurement@acme.com');

    const cookies = res.headers['set-cookie'];
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : String(cookies);
    expect(cookieHeader).toContain('token=');
    expect(cookieHeader.toLowerCase()).toContain('httponly');
  });

  it('POST /api/auth/signin alias should authenticate existing user', async () => {
    // First register
    await request(app)
      .post('/api/auth/register')
      .send({
        companyName: 'Acme Procurement',
        email: 'signin@acme.com',
        password: 'Password123!',
      });

    // Then signin
    const res = await request(app)
      .post('/api/auth/signin')
      .send({
        email: 'signin@acme.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/auth/login should return 401 for incorrect password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        companyName: 'Acme Procurement',
        email: 'procurement@acme.com',
        password: 'Password123!',
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'procurement@acme.com',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/logout should clear the token cookie', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Logged out');

    const cookies = res.headers['set-cookie'];
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : String(cookies);
    expect(cookieHeader).toContain('token=;');
  });

  it('GET /api/auth/me should return user details when cookie is passed', async () => {
    // Register to obtain cookie
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        companyName: 'Acme Procurement',
        email: 'me-test@acme.com',
        password: 'Password123!',
      });

    const cookieHeader = registerRes.headers['set-cookie'];
    const rawCookie = Array.isArray(cookieHeader) ? cookieHeader[0] : String(cookieHeader);
    const tokenMatch = rawCookie.match(/token=([^;]+)/);
    const tokenValue = tokenMatch ? tokenMatch[1] : '';

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `token=${tokenValue}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe('me-test@acme.com');
  });

  it('GET /api/auth/me should return 401 when no token is present', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
