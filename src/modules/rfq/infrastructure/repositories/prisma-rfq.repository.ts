import { Prisma, PrismaClient } from '@prisma/client';
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

interface SerializedQuote {
  id: string;
  name: string;
  rfqId: string;
  unitPrice: number;
  leadTime: string | Date;
  validUntil: string | Date;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface SerializedRFQ {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  neededBy: string | Date;
  userId: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  quotes?: SerializedQuote[];
}

interface SerializedPaginatedRfqResult {
  items: SerializedRFQ[];
  meta: PaginatedRfqResult['meta'];
  stats: PaginatedRfqResult['stats'];
}

export class PrismaRFQRepository implements IRFQRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cacheService?: ICacheService
  ) {}

  public async findById(id: string): Promise<RFQEntity | null> {
    const cacheKey = `rfqs:detail:${id}`;

    if (this.cacheService) {
      const cached = await this.cacheService.get<SerializedRFQ>(cacheKey);
      if (cached) {
        return this.deserializeRFQ(cached);
      }
    }

    const record = await this.prisma.rFQ.findFirst({
      where: { id, isActive: true },
      include: {
        quotes: {
          where: { isActive: true },
        },
      },
    });

    if (!record) return null;
    const entity = this.mapToEntity(record);

    if (this.cacheService) {
      await this.cacheService.set(cacheKey, entity, 120);
    }

    return entity;
  }

  public async findAll(options: RfqFilterOptions = {}): Promise<PaginatedRfqResult> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 9));
    const now = new Date();

    const normalizedSearch = (options.search || '').trim().toLowerCase();
    const normalizedStatus = options.status || 'ALL';
    const normalizedUserId = options.userId || 'all';

    const cacheKey = `rfqs:list:${normalizedUserId}:${page}:${limit}:${normalizedStatus}:${normalizedSearch}`;

    if (this.cacheService) {
      const cached = await this.cacheService.get<SerializedPaginatedRfqResult>(cacheKey);
      if (cached) {
        return {
          items: cached.items.map((item) => this.deserializeRFQ(item)),
          meta: cached.meta,
          stats: cached.stats,
        };
      }
    }

    const where: Prisma.RFQWhereInput = {
      isActive: true,
    };

    if (options.userId) {
      where.userId = options.userId;
    }

    if (options.search && options.search.trim()) {
      const searchTerm = options.search.trim();
      where.OR = [
        { partNumber: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (options.status && options.status !== 'ALL') {
      if (options.status === 'EXPIRED') {
        where.neededBy = { lt: now };
      } else if (options.status === 'QUOTED') {
        where.neededBy = { gte: now };
        where.quotes = { some: { isActive: true } };
      } else if (options.status === 'OPEN') {
        where.neededBy = { gte: now };
        where.quotes = { none: { isActive: true } };
      }
    }

    const userScope = options.userId ? { userId: options.userId } : {};

    const [
      filteredTotal,
      records,
      totalCount,
      openCount,
      quotedCount,
      expiredCount,
    ] = await this.prisma.$transaction([
      this.prisma.rFQ.count({ where }),
      this.prisma.rFQ.findMany({
        where,
        include: {
          quotes: {
            where: { isActive: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.rFQ.count({
        where: { isActive: true, ...userScope },
      }),
      this.prisma.rFQ.count({
        where: {
          isActive: true,
          neededBy: { gte: now },
          quotes: { none: { isActive: true } },
          ...userScope,
        },
      }),
      this.prisma.rFQ.count({
        where: {
          isActive: true,
          neededBy: { gte: now },
          quotes: { some: { isActive: true } },
          ...userScope,
        },
      }),
      this.prisma.rFQ.count({
        where: {
          isActive: true,
          neededBy: { lt: now },
          ...userScope,
        },
      }),
    ]);

    const totalPages = Math.ceil(filteredTotal / limit) || 1;

    const result: PaginatedRfqResult = {
      items: records.map((record) => this.mapToEntity(record)),
      meta: {
        page,
        limit,
        total: filteredTotal,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      stats: {
        total: totalCount,
        open: openCount,
        quoted: quotedCount,
        expired: expiredCount,
      },
    };

    if (this.cacheService) {
      await this.cacheService.set(cacheKey, result, 60);
    }

    return result;
  }

  public async create(data: CreateRFQData): Promise<RFQEntity> {
    const payload = {
      partNumber: data.partNumber,
      description: data.description,
      quantity: data.quantity,
      neededBy: data.neededBy,
      userId: data.userId,
    };

    const record = await this.prisma.rFQ.create({
      data: payload as unknown as Prisma.RFQUncheckedCreateInput,
      include: {
        quotes: {
          where: { isActive: true },
        },
      },
    });

    if (this.cacheService) {
      await this.cacheService.delByPattern('rfqs:list:*');
    }

    return this.mapToEntity(record);
  }

  public async update(id: string, data: UpdateRFQData): Promise<RFQEntity | null> {
    try {
      const record = await this.prisma.rFQ.update({
        where: { id },
        data: {
          ...(data.partNumber && { partNumber: data.partNumber }),
          ...(data.description && { description: data.description }),
          ...(data.quantity && { quantity: data.quantity }),
          ...(data.neededBy && { neededBy: data.neededBy }),
        },
        include: {
          quotes: {
            where: { isActive: true },
          },
        },
      });

      if (this.cacheService) {
        await Promise.all([
          this.cacheService.delByPattern('rfqs:list:*'),
          this.cacheService.del(`rfqs:detail:${id}`),
        ]);
      }

      return this.mapToEntity(record);
    } catch {
      return null;
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      const result = await this.prisma.rFQ.updateMany({
        where: { id, isActive: true },
        data: { isActive: false },
      });

      if (result.count > 0 && this.cacheService) {
        await Promise.all([
          this.cacheService.delByPattern('rfqs:list:*'),
          this.cacheService.del(`rfqs:detail:${id}`),
          this.cacheService.delByPattern(`quotations:rfq:${id}:*`),
        ]);
      }

      return result.count > 0;
    } catch {
      return false;
    }
  }

  private deserializeRFQ(item: SerializedRFQ): RFQEntity {
    const quotes = (item.quotes || []).map(
      (q) =>
        new SupplierQuoteEntity({
          id: q.id,
          name: q.name,
          rfqId: q.rfqId,
          unitPrice: Number(q.unitPrice),
          leadTime: new Date(q.leadTime),
          validUntil: new Date(q.validUntil),
          isActive: q.isActive,
          createdAt: new Date(q.createdAt),
          updatedAt: new Date(q.updatedAt),
        })
    );

    return new RFQEntity({
      id: item.id,
      partNumber: item.partNumber,
      description: item.description,
      quantity: item.quantity,
      neededBy: new Date(item.neededBy),
      userId: item.userId,
      isActive: item.isActive,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      quotes,
    });
  }

  private mapToEntity(record: {
    id: string;
    partNumber: string;
    description: string;
    quantity: number;
    neededBy: Date;
    userId: string;
    isActive?: boolean;
    createdAt: Date;
    updatedAt: Date;
    quotes?: Array<{
      id: string;
      rfqId: string;
      unitPrice: unknown;
      validUntil: Date;
      isActive?: boolean;
      createdAt: Date;
      updatedAt: Date;
      name?: string;
      supplierName?: string;
      leadTime?: unknown;
    }>;
  }): RFQEntity {
    const quoteEntities = (record.quotes || []).map((q) => {
      const resolvedName =
        typeof q.name === 'string'
          ? q.name
          : typeof q.supplierName === 'string'
            ? q.supplierName
            : '';

      const resolvedLeadTime =
        q.leadTime instanceof Date
          ? q.leadTime
          : new Date(String(q.leadTime));

      return new SupplierQuoteEntity({
        id: q.id,
        name: resolvedName,
        rfqId: q.rfqId,
        unitPrice: Number(q.unitPrice),
        leadTime: resolvedLeadTime,
        validUntil: q.validUntil,
        isActive: q.isActive !== undefined ? q.isActive : true,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      });
    });

    return new RFQEntity({
      id: record.id,
      partNumber: record.partNumber,
      description: record.description,
      quantity: record.quantity,
      neededBy: record.neededBy,
      userId: record.userId,
      isActive: record.isActive !== undefined ? record.isActive : true,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      quotes: quoteEntities,
    });
  }
}
