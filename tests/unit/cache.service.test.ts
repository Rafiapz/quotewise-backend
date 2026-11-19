import { describe, it, expect, vi, beforeEach } from "vitest";
import Redis from "ioredis";
import { RedisCacheService } from "../../src/shared/infrastructure/cache/redis-cache.service";
import { ICacheService } from "../../src/shared/domain/services/cache.service.interface";
import { CachedRFQRepository } from "../../src/modules/rfq/infrastructure/repositories/cached-rfq.repository";
import { CachedQuotationRepository } from "../../src/modules/quotation/infrastructure/repositories/cached-quotation.repository";
import { IRFQRepository } from "../../src/modules/rfq/domain/repositories/rfq.repository.interface";
import { IQuotationRepository } from "../../src/modules/quotation/domain/repositories/quotation.repository.interface";
import { RFQEntity } from "../../src/modules/rfq/domain/entities/rfq.entity";
import { SupplierQuoteEntity } from "../../src/modules/quotation/domain/entities/quotation.entity";

describe("RedisCacheService Unit Tests", () => {
  let mockRedis: Partial<Redis>;
  let cacheService: ICacheService;

  beforeEach(() => {
    mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      scan: vi.fn(),
      exists: vi.fn(),
      flushdb: vi.fn(),
    };
    cacheService = new RedisCacheService(mockRedis as Redis);
  });

  it("should return parsed JSON object on cache hit", async () => {
    const data = { id: "rfq-1", partNumber: "PART-100" };
    vi.mocked(mockRedis.get!).mockResolvedValue(JSON.stringify(data));

    const result = await cacheService.get<typeof data>("test-key");
    expect(result).toEqual(data);
    expect(mockRedis.get).toHaveBeenCalledWith("test-key");
  });

  it("should return null on cache miss", async () => {
    vi.mocked(mockRedis.get!).mockResolvedValue(null);

    const result = await cacheService.get("missing-key");
    expect(result).toBeNull();
  });

  it("should handle Redis get errors gracefully and return null", async () => {
    vi.mocked(mockRedis.get!).mockRejectedValue(
      new Error("Redis connection lost"),
    );

    const result = await cacheService.get("failing-key");
    expect(result).toBeNull();
  });

  it("should serialize value and set with TTL", async () => {
    vi.mocked(mockRedis.set!).mockResolvedValue("OK");
    const value = { name: "Quote", price: 99.5 };

    await cacheService.set("quote-key", value, 120);
    expect(mockRedis.set).toHaveBeenCalledWith(
      "quote-key",
      JSON.stringify(value),
      "EX",
      120,
    );
  });

  it("should delete a single key", async () => {
    vi.mocked(mockRedis.del!).mockResolvedValue(1);

    await cacheService.del("target-key");
    expect(mockRedis.del).toHaveBeenCalledWith("target-key");
  });

  it("should safely scan and delete keys matching pattern using cursor iteration", async () => {
    // First iteration returns keys and next cursor '10', second returns keys and '0'
    vi.mocked(mockRedis.scan!)
      .mockResolvedValueOnce(["10", ["rfqs:list:1", "rfqs:list:2"]])
      .mockResolvedValueOnce(["0", ["rfqs:list:3"]]);
    vi.mocked(mockRedis.del!).mockResolvedValue(2);

    await cacheService.delByPattern("rfqs:list:*");

    expect(mockRedis.scan).toHaveBeenCalledTimes(2);
    expect(mockRedis.del).toHaveBeenCalledWith("rfqs:list:1", "rfqs:list:2");
    expect(mockRedis.del).toHaveBeenCalledWith("rfqs:list:3");
  });

  it("should check key existence", async () => {
    vi.mocked(mockRedis.exists!).mockResolvedValue(1);
    const exists = await cacheService.has("exists-key");
    expect(exists).toBe(true);

    vi.mocked(mockRedis.exists!).mockResolvedValue(0);
    const notExists = await cacheService.has("not-exists-key");
    expect(notExists).toBe(false);
  });

  it("should operate safely without throwing when redis client is null (fail-soft)", async () => {
    const nullCache = new RedisCacheService(null);

    expect(await nullCache.get("any-key")).toBeNull();
    await expect(nullCache.set("any-key", { a: 1 })).resolves.not.toThrow();
    await expect(nullCache.del("any-key")).resolves.not.toThrow();
    await expect(nullCache.delByPattern("any-*")).resolves.not.toThrow();
    expect(await nullCache.has("any-key")).toBe(false);
  });
});

describe("CachedRFQRepository Decorator Unit Tests", () => {
  let mockInnerRepo: Partial<IRFQRepository>;
  let mockCache: Partial<ICacheService>;
  let cachedRepo: CachedRFQRepository;

  const mockDate = new Date("2026-12-01T12:00:00Z");
  const sampleRfqEntity = new RFQEntity({
    id: "rfq-uuid-1",
    partNumber: "BRG-1029",
    description: "Ball Bearing",
    quantity: 100,
    neededBy: mockDate,
    userId: "user-1",
    createdAt: new Date("2026-11-01T10:00:00Z"),
    updatedAt: new Date("2026-11-01T10:00:00Z"),
    quotes: [
      new SupplierQuoteEntity({
        id: "q-1",
        name: "Supplier A",
        rfqId: "rfq-uuid-1",
        unitPrice: 15.0,
        leadTime: mockDate,
        validUntil: mockDate,
        createdAt: new Date("2026-11-01T10:00:00Z"),
        updatedAt: new Date("2026-11-01T10:00:00Z"),
      }),
    ],
  });

  beforeEach(() => {
    mockInnerRepo = {
      findById: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      delByPattern: vi.fn(),
    };

    cachedRepo = new CachedRFQRepository(
      mockInnerRepo as IRFQRepository,
      mockCache as ICacheService,
    );
  });

  it("should return cached entity on cache hit without calling inner repository", async () => {
    // Plain serialized object in cache
    const rawCacheData = {
      id: "rfq-uuid-1",
      partNumber: "BRG-1029",
      description: "Ball Bearing",
      quantity: 100,
      neededBy: mockDate.toISOString(),
      userId: "user-1",
      createdAt: "2026-11-01T10:00:00.000Z",
      updatedAt: "2026-11-01T10:00:00.000Z",
      quotes: [
        {
          id: "q-1",
          name: "Supplier A",
          rfqId: "rfq-uuid-1",
          unitPrice: 15.0,
          leadTime: mockDate.toISOString(),
          validUntil: mockDate.toISOString(),
          createdAt: "2026-11-01T10:00:00.000Z",
          updatedAt: "2026-11-01T10:00:00.000Z",
        },
      ],
    };

    vi.mocked(mockCache.get!).mockResolvedValue(rawCacheData);

    const result = await cachedRepo.findById("rfq-uuid-1");

    expect(result).not.toBeNull();
    expect(result).toBeInstanceOf(RFQEntity);
    expect(result!.id).toBe("rfq-uuid-1");
    expect(result!.status).toBe("QUOTED");
    expect(result!.quoteCount).toBe(1);
    expect(result!.bestQuote?.name).toBe("Supplier A");
    expect(result!.neededBy).toBeInstanceOf(Date);
    expect(mockInnerRepo.findById).not.toHaveBeenCalled();
  });

  it("should fetch from inner repo on cache miss and save to cache", async () => {
    vi.mocked(mockCache.get!).mockResolvedValue(null);
    vi.mocked(mockInnerRepo.findById!).mockResolvedValue(sampleRfqEntity);

    const result = await cachedRepo.findById("rfq-uuid-1");

    expect(result).toEqual(sampleRfqEntity);
    expect(mockInnerRepo.findById).toHaveBeenCalledWith("rfq-uuid-1");
    expect(mockCache.set).toHaveBeenCalledWith(
      "rfqs:detail:rfq-uuid-1",
      sampleRfqEntity,
      300,
    );
  });

  it("should invalidate list cache on create", async () => {
    vi.mocked(mockInnerRepo.create!).mockResolvedValue(sampleRfqEntity);

    await cachedRepo.create({
      partNumber: "BRG-1029",
      description: "Ball Bearing",
      quantity: 100,
      neededBy: mockDate,
      userId: "user-1",
    });

    expect(mockInnerRepo.create).toHaveBeenCalled();
    expect(mockCache.delByPattern).toHaveBeenCalledWith("rfqs:list:*");
  });

  it("should invalidate entity and list cache on update and delete", async () => {
    vi.mocked(mockInnerRepo.update!).mockResolvedValue(sampleRfqEntity);
    await cachedRepo.update("rfq-uuid-1", { quantity: 200 });

    expect(mockCache.del).toHaveBeenCalledWith("rfqs:detail:rfq-uuid-1");
    expect(mockCache.delByPattern).toHaveBeenCalledWith("rfqs:list:*");

    vi.mocked(mockInnerRepo.delete!).mockResolvedValue(true);
    await cachedRepo.delete("rfq-uuid-1");

    expect(mockCache.del).toHaveBeenCalledWith("rfqs:detail:rfq-uuid-1");
    expect(mockCache.delByPattern).toHaveBeenCalledWith(
      "quotes:rfq:rfq-uuid-1:*",
    );
    expect(mockCache.delByPattern).toHaveBeenCalledWith("rfqs:list:*");
  });
});

describe("CachedQuotationRepository Decorator Unit Tests", () => {
  let mockInnerRepo: Partial<IQuotationRepository>;
  let mockCache: Partial<ICacheService>;
  let cachedRepo: CachedQuotationRepository;

  const sampleQuote = new SupplierQuoteEntity({
    id: "quote-10",
    name: "Top Supplier",
    rfqId: "rfq-100",
    unitPrice: 42.0,
    leadTime: new Date("2026-12-05T00:00:00Z"),
    validUntil: new Date("2026-12-20T00:00:00Z"),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockInnerRepo = {
      findById: vi.fn(),
      findByRfqId: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteByRfqId: vi.fn(),
    };

    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      delByPattern: vi.fn(),
    };

    cachedRepo = new CachedQuotationRepository(
      mockInnerRepo as IQuotationRepository,
      mockCache as ICacheService,
    );
  });

  it("should invalidate RFQ cache and quotation lists when a new quotation is created", async () => {
    vi.mocked(mockInnerRepo.create!).mockResolvedValue(sampleQuote);

    await cachedRepo.create({
      name: "Top Supplier",
      rfqId: "rfq-100",
      unitPrice: 42.0,
      leadTime: new Date("2026-12-05T00:00:00Z"),
      validUntil: new Date("2026-12-20T00:00:00Z"),
    });

    expect(mockInnerRepo.create).toHaveBeenCalled();
    expect(mockCache.delByPattern).toHaveBeenCalledWith("quotes:rfq:rfq-100:*");
    expect(mockCache.del).toHaveBeenCalledWith("quotes:all");
    // Parent RFQ cache invalidated because status/quote count changes:
    expect(mockCache.del).toHaveBeenCalledWith("rfqs:detail:rfq-100");
    expect(mockCache.delByPattern).toHaveBeenCalledWith("rfqs:list:*");
  });
});
