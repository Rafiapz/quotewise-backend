import { describe, it, expect } from "vitest";
import { createAppContainer } from "../../src/container";

describe("Awilix IoC Container Unit Tests", () => {
  it("should create and resolve all dependencies correctly from the cradle", () => {
    const container = createAppContainer();
    const cradle = container.cradle;

    // Verify Services & Middleware
    expect(cradle.cacheService).toBeDefined();
    expect(cradle.passwordHasher).toBeDefined();
    expect(cradle.tokenService).toBeDefined();
    expect(cradle.authMiddleware).toBeDefined();

    // Verify Repositories
    expect(cradle.userRepository).toBeDefined();
    expect(cradle.rfqRepository).toBeDefined();
    expect(cradle.quotationRepository).toBeDefined();

    // Verify Use Cases
    expect(cradle.authUseCases).toBeDefined();
    expect(cradle.rfqUseCases).toBeDefined();
    expect(cradle.quotationUseCases).toBeDefined();

    // Verify PascalCase registrations (as per Clean Architecture Awilix standard)
    expect(cradle.AuthController).toBeDefined();
    expect(cradle.RFQController).toBeDefined();
    expect(cradle.QuotationController).toBeDefined();
    expect(cradle.AuthUseCases).toBeDefined();
    expect(cradle.RFQUseCases).toBeDefined();
    expect(cradle.QuotationUseCases).toBeDefined();
    expect(cradle.UserRepository).toBeDefined();
    expect(cradle.RFQRepository).toBeDefined();
    expect(cradle.QuotationRepository).toBeDefined();
    expect(cradle.CacheService).toBeDefined();
    expect(cradle.PasswordHasher).toBeDefined();
    expect(cradle.TokenService).toBeDefined();

    // Verify Controllers
    expect(cradle.authController).toBeDefined();
    expect(cradle.rfqController).toBeDefined();
    expect(cradle.quotationController).toBeDefined();

    // Verify deep constructor injection (ensuring Awilix proxy did not replace target dependencies)
    expect(typeof (cradle.authUseCases as any).userRepository.findById).toBe("function");
    expect(typeof (cradle.rfqController as any).rfqUseCases.getRfqById).toBe("function");
    expect(typeof (cradle.quotationController as any).quotationUseCases.getQuotationsByRfq).toBe("function");
  });

  it("should allow partial overrides for testing", () => {
    const mockHasher = {
      hash: async () => "mocked-hash",
      compare: async () => true,
    };

    const container = createAppContainer({
      passwordHasher: mockHasher,
    });

    expect(container.cradle.passwordHasher).toBe(mockHasher);
  });
});
