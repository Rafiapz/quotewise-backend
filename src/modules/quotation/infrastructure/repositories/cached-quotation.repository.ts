import {
  IQuotationRepository,
  CreateSupplierQuoteData,
  QuotationFilterOptions,
  PaginatedQuotationResult,
} from '../../domain/repositories/quotation.repository.interface';
import { SupplierQuoteEntity } from '../../domain/entities/quotation.entity';
import { ICacheService } from '../../../../shared/domain/services/cache.service.interface';
import { logger } from '../../../../shared/utils/logger';

/**
 * Decorator implementing IQuotationRepository with transparent Redis caching.
 * Maintains domain entity integrity and synchronizes cache invalidation with related RFQs.
 */
export class CachedQuotationRepository implements IQuotationRepository {
  private readonly entityTTL = 300; // 5 minutes
  private readonly listTTL = 60;    // 1 minute

  constructor(
    private readonly inner: IQuotationRepository,
    private readonly cache: ICacheService
  ) {}

  public async findById(id: string): Promise<SupplierQuoteEntity | null> {
    const cacheKey = `quotes:detail:${id}`;
    const cached = await this.cache.get<any>(cacheKey);

    if (cached) {
      logger.info(`[CACHE HIT] ${cacheKey}`);
      return this.hydrateEntity(cached);
    }

    logger.info(`[CACHE MISS] ${cacheKey} -> querying Database`);
    const quote = await this.inner.findById(id);
    if (quote) {
      await this.cache.set(cacheKey, quote, this.entityTTL);
    }

    return quote;
  }

  public async findByRfqId(
    rfqId: string,
    options: QuotationFilterOptions = {}
  ): Promise<PaginatedQuotationResult> {
    const page = options.page || 1;
    const limit = options.limit || 6;
    const sortBy = options.sortBy || 'price_asc';
    const search = (options.search || '').trim().toLowerCase();
    const cacheKey = `quotes:rfq:${rfqId}:${page}:${limit}:${sortBy}:${search}`;

    const cached = await this.cache.get<any>(cacheKey);

    if (cached && Array.isArray(cached.items)) {
      logger.info(`[CACHE HIT] ${cacheKey}`);
      return {
        ...cached,
        items: cached.items.map((raw: any) => this.hydrateEntity(raw)),
      };
    }

    logger.info(`[CACHE MISS] ${cacheKey} -> querying Database`);
    const result = await this.inner.findByRfqId(rfqId, options);
    await this.cache.set(cacheKey, result, this.listTTL);
    return result;
  }

  public async findAll(): Promise<SupplierQuoteEntity[]> {
    const cacheKey = 'quotes:all';
    const cached = await this.cache.get<any[]>(cacheKey);

    if (cached && Array.isArray(cached)) {
      logger.info(`[CACHE HIT] ${cacheKey}`);
      return cached.map((raw: any) => this.hydrateEntity(raw));
    }

    logger.info(`[CACHE MISS] ${cacheKey} -> querying Database`);
    const result = await this.inner.findAll();
    await this.cache.set(cacheKey, result, this.listTTL);
    return result;
  }

  public async create(data: CreateSupplierQuoteData): Promise<SupplierQuoteEntity> {
    const created = await this.inner.create(data);

    logger.info(`[CACHE INVALIDATE] quotes:rfq:${data.rfqId}:*, quotes:all, rfqs:detail:${data.rfqId}, rfqs:list:*`);
    // Invalidate quotation lists, global list, and parent RFQ cache
    await Promise.all([
      this.cache.delByPattern(`quotes:rfq:${data.rfqId}:*`),
      this.cache.del('quotes:all'),
      this.cache.del(`rfqs:detail:${data.rfqId}`),
      this.cache.delByPattern('rfqs:list:*'),
    ]);

    return created;
  }

  public async delete(id: string): Promise<boolean> {
    const existing = await this.inner.findById(id);
    const deleted = await this.inner.delete(id);

    if (deleted && existing) {
      await Promise.all([
        this.cache.del(`quotes:detail:${id}`),
        this.cache.delByPattern(`quotes:rfq:${existing.rfqId}:*`),
        this.cache.del('quotes:all'),
        this.cache.del(`rfqs:detail:${existing.rfqId}`),
        this.cache.delByPattern('rfqs:list:*'),
      ]);
    }

    return deleted;
  }

  public async deleteByRfqId(rfqId: string): Promise<number> {
    const count = await this.inner.deleteByRfqId(rfqId);

    await Promise.all([
      this.cache.delByPattern(`quotes:rfq:${rfqId}:*`),
      this.cache.del('quotes:all'),
      this.cache.del(`rfqs:detail:${rfqId}`),
      this.cache.delByPattern('rfqs:list:*'),
    ]);

    return count;
  }

  /**
   * Rehydrates JSON-serialized plain objects into SupplierQuoteEntity instances.
   */
  private hydrateEntity(raw: any): SupplierQuoteEntity {
    return new SupplierQuoteEntity({
      id: raw.id,
      name: raw.name,
      rfqId: raw.rfqId,
      unitPrice: Number(raw.unitPrice),
      leadTime: new Date(raw.leadTime),
      validUntil: new Date(raw.validUntil),
      isActive: raw.isActive !== undefined ? raw.isActive : true,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    });
  }
}
