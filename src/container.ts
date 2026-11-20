import {
  createContainer,
  asClass,
  asFunction,
  asValue,
  aliasTo,
  AwilixContainer,
  InjectionMode,
  NameAndRegistrationPair,
} from "awilix";
import { RequestHandler } from "express";
import Redis from "ioredis";
import { config } from "./config/env";
import { prisma } from "./config/database";
import { getRedisClient } from "./config/redis";

// Shared & Infrastructure
import { ICacheService } from "./shared/domain/services/cache.service.interface";
import { RedisCacheService } from "./shared/infrastructure/cache/redis-cache.service";
import { createAuthMiddleware } from "./shared/middleware/auth.middleware";

// Auth Module
import { IUserRepository } from "./modules/auth/domain/repositories/user.repository.interface";
import { IPasswordHasher } from "./modules/auth/domain/services/password-hasher.interface";
import { ITokenService } from "./modules/auth/domain/services/token-service.interface";
import { PrismaUserRepository } from "./modules/auth/infrastructure/repositories/prisma-user.repository";
import { BcryptPasswordHasher } from "./modules/auth/infrastructure/services/bcrypt-password-hasher";
import { JwtTokenService } from "./modules/auth/infrastructure/services/jwt-token-service";
import { AuthUseCases } from "./modules/auth/application/use-cases/auth.use-cases";
import { AuthController } from "./modules/auth/presentation/controllers/auth.controller";

// RFQ Module
import { IRFQRepository } from "./modules/rfq/domain/repositories/rfq.repository.interface";
import { PrismaRFQRepository } from "./modules/rfq/infrastructure/repositories/prisma-rfq.repository";
import { CachedRFQRepository } from "./modules/rfq/infrastructure/repositories/cached-rfq.repository";
import { RFQUseCases } from "./modules/rfq/application/use-cases/rfq.use-cases";
import { RFQController } from "./modules/rfq/presentation/controllers/rfq.controller";

// Quotation Module
import { IQuotationRepository } from "./modules/quotation/domain/repositories/quotation.repository.interface";
import { PrismaQuotationRepository } from "./modules/quotation/infrastructure/repositories/prisma-quotation.repository";
import { CachedQuotationRepository } from "./modules/quotation/infrastructure/repositories/cached-quotation.repository";
import { QuotationUseCases } from "./modules/quotation/application/use-cases/quotation.use-cases";
import { QuotationController } from "./modules/quotation/presentation/controllers/quotation.controller";

/**
 * Cradle Interface holding all typed application dependencies.
 * Supports PascalCase tokens and camelCase aliases for clean dependency inversion.
 */
export interface AppCradle {
  // Config & Clients
  Prisma: typeof prisma;
  Config: typeof config;
  Redis: Redis | null;
  prisma: typeof prisma;
  config: typeof config;
  redis: Redis | null;

  // Shared Services & Middleware
  CacheService: ICacheService;
  cacheService: ICacheService;
  PasswordHasher: IPasswordHasher;
  passwordHasher: IPasswordHasher;
  TokenService: ITokenService;
  tokenService: ITokenService;
  AuthMiddleware: RequestHandler;
  authMiddleware: RequestHandler;

  // Auth Module
  UserRepository: IUserRepository;
  userRepository: IUserRepository;
  AuthUseCases: AuthUseCases;
  authUseCases: AuthUseCases;
  AuthController: AuthController;
  authController: AuthController;

  // RFQ Module
  PrismaRFQRepository: IRFQRepository;
  prismaRfqRepository: IRFQRepository;
  RFQRepository: IRFQRepository;
  rfqRepository: IRFQRepository;
  RFQUseCases: RFQUseCases;
  rfqUseCases: RFQUseCases;
  RFQController: RFQController;
  rfqController: RFQController;

  // Quotation Module
  PrismaQuotationRepository: IQuotationRepository;
  prismaQuotationRepository: IQuotationRepository;
  QuotationRepository: IQuotationRepository;
  quotationRepository: IQuotationRepository;
  QuotationUseCases: QuotationUseCases;
  quotationUseCases: QuotationUseCases;
  QuotationController: QuotationController;
  quotationController: QuotationController;
}

/**
 * Transforms plain value overrides into Awilix value resolvers.
 */
const toValueRegistrations = (
  overrides: Partial<AppCradle>,
): NameAndRegistrationPair<AppCradle> =>
  Object.fromEntries(
    Object.entries(overrides)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, asValue(value)]),
  ) as NameAndRegistrationPair<AppCradle>;

/**
 * Creates and configures the Awilix IoC container.
 */
export const createAppContainer = (
  overrides: Partial<AppCradle> = {},
): AwilixContainer<AppCradle> => {
  const container = createContainer<AppCradle>({
    injectionMode: InjectionMode.PROXY,
  });

  container.register({
    // Config & Clients
    Prisma: asValue(prisma),
    Config: asValue(config),
    Redis: asFunction(() => getRedisClient()).singleton(),

    // Shared & Infrastructure
    CacheService: asClass(RedisCacheService).singleton(),
    PasswordHasher: asClass(BcryptPasswordHasher).singleton(),
    TokenService: asClass(JwtTokenService).singleton(),

    // Auth Module
    UserRepository: asClass(PrismaUserRepository).singleton(),
    AuthUseCases: asClass(AuthUseCases).singleton(),
    AuthController: asClass(AuthController).singleton(),

    // RFQ Module
    PrismaRFQRepository: asClass(PrismaRFQRepository).singleton(),
    RFQRepository: asClass(CachedRFQRepository).singleton(),
    RFQUseCases: asClass(RFQUseCases).singleton(),
    RFQController: asClass(RFQController).singleton(),

    // Quotation Module
    PrismaQuotationRepository: asClass(PrismaQuotationRepository).singleton(),
    QuotationRepository: asClass(CachedQuotationRepository).singleton(),
    QuotationUseCases: asClass(QuotationUseCases).singleton(),
    QuotationController: asClass(QuotationController).singleton(),

    // Middleware
    AuthMiddleware: asFunction((c: AppCradle) =>
      createAuthMiddleware(c.TokenService, c.Config.COOKIE_NAME),
    ).singleton(),

    // camelCase Aliases for backward compatibility
    prisma: aliasTo("Prisma"),
    config: aliasTo("Config"),
    redis: aliasTo("Redis"),
    cacheService: aliasTo("CacheService"),
    passwordHasher: aliasTo("PasswordHasher"),
    tokenService: aliasTo("TokenService"),
    authMiddleware: aliasTo("AuthMiddleware"),

    userRepository: aliasTo("UserRepository"),
    authUseCases: aliasTo("AuthUseCases"),
    authController: aliasTo("AuthController"),

    prismaRfqRepository: aliasTo("PrismaRFQRepository"),
    rfqRepository: aliasTo("RFQRepository"),
    rfqUseCases: aliasTo("RFQUseCases"),
    rfqController: aliasTo("RFQController"),

    prismaQuotationRepository: aliasTo("PrismaQuotationRepository"),
    quotationRepository: aliasTo("QuotationRepository"),
    quotationUseCases: aliasTo("QuotationUseCases"),
    quotationController: aliasTo("QuotationController"),

    // Test / Runtime Overrides
    ...toValueRegistrations(overrides),
  });

  return container;
};
