import {
  IRFQRepository,
  CreateRFQData,
  UpdateRFQData,
  RfqFilterOptions,
  PaginatedRfqResult,
} from '../../domain/repositories/rfq.repository.interface';
import { RFQEntity } from '../../domain/entities/rfq.entity';
import { SupplierQuoteEntity } from '../../../quotation/domain/entities/quotation.entity';
import { ICacheService } from '../../../../shared/domain/services/cache.service.interface';
import { logger } from '../../../../shared/utils/logger';

/**
 * Decorator implementing IRFQRepository with transparent Redis caching.
 * Follows Open/Closed and Single Responsibility Clean Architecture principles:
 * - PrismaRFQRepository handles database queries.
 * - CachedRFQRepository adds high-performance caching & cache-invalidation.
 */
export class CachedRFQRepository implements IRFQRepository {
  private readonly entityTTL = 300; // 5 minutes for single RFQ
  private readonly listTTL = 60;    // 1 minute for paginated lists

  constructor(
    private readonly inner: IRFQRepository,
    private readonly cache: ICacheService
  ) {}

  public async findById(id: string): Promise<RFQEntity | null> {
    const cacheKey = `rfqs:detail:${id}`;
    const cached = await this.cache.get<any>(cacheKey);

    if (cached) {
      logger.info(`[CACHE HIT] ${cacheKey}`);
      return this.hydrateEntity(cached);
    }

    logger.info(`[CACHE MISS] ${cacheKey} -> querying Database`);
    const rfq = await this.inner.findById(id);
    if (rfq) {
      await this.cache.set(cacheKey, rfq, this.entityTTL);
    }

    return rfq;
  }

  public async findAll(options: RfqFilterOptions = {}): Promise<PaginatedRfqResult> {
    const page = options.page || 1;
    const limit = options.limit || 9;
    const status = options.status || 'ALL';
    const userId = options.userId || 'all';
    const search = (options.search || '').trim().toLowerCase();
    const cacheKey = `rfqs:list:${userId}:${page}:${limit}:${status}:${search}`;

    const cached = await this.cache.get<any>(cacheKey);

    if (cached && Array.isArray(cached.items)) {
      logger.info(`[CACHE HIT] ${cacheKey}`);
      return {
        ...cached,
        items: cached.items.map((raw: any) => this.hydrateEntity(raw)),
      };
    }

    logger.info(`[CACHE MISS] ${cacheKey} -> querying Database`);
    const result = await this.inner.findAll(options);
    await this.cache.set(cacheKey, result, this.listTTL);
    return result;
  }

  public async create(data: CreateRFQData): Promise<RFQEntity> {
    const created = await this.inner.create(data);
    await this.invalidateListCache();
    return created;
  }

  public async update(id: string, data: UpdateRFQData): Promise<RFQEntity | null> {
    const updated = await this.inner.update(id, data);
    logger.info(`[CACHE INVALIDATE] rfqs:detail:${id} & rfqs:list:*`);
    await Promise.all([
      this.cache.del(`rfqs:detail:${id}`),
      this.invalidateListCache(),
    ]);
    return updated;
  }

  public async delete(id: string): Promise<boolean> {
    const deleted = await this.inner.delete(id);
    logger.info(`[CACHE INVALIDATE] rfqs:detail:${id}, quotes:rfq:${id}:*, & rfqs:list:*`);
    await Promise.all([
      this.cache.del(`rfqs:detail:${id}`),
      this.cache.delByPattern(`quotes:rfq:${id}:*`),
      this.invalidateListCache(),
    ]);
    return deleted;
  }

  private async invalidateListCache(): Promise<void> {
    logger.info('[CACHE INVALIDATE] rfqs:list:*');
    await this.cache.delByPattern('rfqs:list:*');
  }

  /**
   * Rehydrates JSON-serialized plain objects back into rich Domain Entity instances.
   * Restores Date objects and preserves domain methods and computed getters (status, bestQuote).
   */
  private hydrateEntity(raw: any): RFQEntity {
    const quotes = (raw.quotes || []).map(
      (q: any) =>
        new SupplierQuoteEntity({
          id: q.id,
          name: q.name,
          rfqId: q.rfqId,
          unitPrice: Number(q.unitPrice),
          leadTime: new Date(q.leadTime),
          validUntil: new Date(q.validUntil),
          isActive: q.isActive !== undefined ? q.isActive : true,
          createdAt: new Date(q.createdAt),
          updatedAt: new Date(q.updatedAt),
        })
    );

    return new RFQEntity({
      id: raw.id,
      partNumber: raw.partNumber,
      description: raw.description,
      quantity: raw.quantity,
      neededBy: new Date(raw.neededBy),
      userId: raw.userId,
      isActive: raw.isActive !== undefined ? raw.isActive : true,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
      quotes,
    });
  }
}
