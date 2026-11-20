import {
  IRFQRepository,
  CreateRFQData,
  UpdateRFQData,
  RfqFilterOptions,
  PaginatedRfqResult,
} from "../../domain/repositories/rfq.repository.interface";
import { RFQEntity } from "../../domain/entities/rfq.entity";
import { ICacheService } from "../../../../shared/domain/services/cache.service.interface";
import { logger } from "../../../../shared/utils/logger";

export interface CachedRFQRepositoryConstructorParams {
  PrismaRFQRepository: IRFQRepository;
  CacheService: ICacheService;
}

export class CachedRFQRepository implements IRFQRepository {
  private entityTTL = 600; // 10 minutes (600 seconds)
  private listTTL = 600; // 10 minutes (600 seconds)
  private inner: IRFQRepository;
  private cache: ICacheService;

  constructor({
    PrismaRFQRepository,
    CacheService,
  }: CachedRFQRepositoryConstructorParams) {
    this.inner = PrismaRFQRepository;
    this.cache = CacheService;
  }

  async findById(id: string): Promise<RFQEntity | null> {
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

  async findAll(
    options: RfqFilterOptions = {},
  ): Promise<PaginatedRfqResult> {
    const page = options.page || 1;
    const limit = options.limit || 9;
    const status = options.status || "ALL";
    const userId = options.userId || "all";
    const search = (options.search || "").trim().toLowerCase();
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

  async create(data: CreateRFQData): Promise<RFQEntity> {
    const created = await this.inner.create(data);
    await this.invalidateListCache();
    return created;
  }

  async update(
    id: string,
    data: UpdateRFQData,
  ): Promise<RFQEntity | null> {
    const updated = await this.inner.update(id, data);
    logger.info(`[CACHE INVALIDATE] rfqs:detail:${id} & rfqs:list:*`);
    await Promise.all([
      this.cache.del(`rfqs:detail:${id}`),
      this.invalidateListCache(),
    ]);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.inner.delete(id);
    logger.info(
      `[CACHE INVALIDATE] rfqs:detail:${id}, quotes:rfq:${id}:*, & rfqs:list:*`,
    );
    await Promise.all([
      this.cache.del(`rfqs:detail:${id}`),
      this.cache.delByPattern(`quotes:rfq:${id}:*`),
      this.invalidateListCache(),
    ]);
    return deleted;
  }

  private async invalidateListCache(): Promise<void> {
    logger.info("[CACHE INVALIDATE] rfqs:list:*");
    await this.cache.delByPattern("rfqs:list:*");
  }

  /**
   * Rehydrates JSON-serialized plain objects back into rich Domain Entity instances.
   */
  private hydrateEntity(raw: any): RFQEntity {
    return RFQEntity.fromJSON(raw);
  }
}
