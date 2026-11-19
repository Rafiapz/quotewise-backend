import { Prisma, PrismaClient } from '@prisma/client';
import {
  IQuotationRepository,
  CreateSupplierQuoteData,
  QuotationFilterOptions,
  PaginatedQuotationResult,
} from '../../domain/repositories/quotation.repository.interface';
import { SupplierQuoteEntity } from '../../domain/entities/quotation.entity';
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

interface SerializedPaginatedQuotationResult {
  items: SerializedQuote[];
  meta: PaginatedQuotationResult['meta'];
  lowestUnitPrice?: number;
}

export class PrismaQuotationRepository implements IQuotationRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cacheService?: ICacheService
  ) {}

  public async findById(id: string): Promise<SupplierQuoteEntity | null> {
    const record = await this.prisma.supplierQuote.findFirst({
      where: { id, isActive: true },
    });

    if (!record) return null;
    return this.mapToEntity(record);
  }

  public async findByRfqId(
    rfqId: string,
    options: QuotationFilterOptions = {}
  ): Promise<PaginatedQuotationResult> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 6));
    const normalizedSearch = (options.search || '').trim().toLowerCase();
    const normalizedSort = options.sortBy || 'price_asc';

    const cacheKey = `quotations:rfq:${rfqId}:${page}:${limit}:${normalizedSort}:${normalizedSearch}`;

    if (this.cacheService) {
      const cached = await this.cacheService.get<SerializedPaginatedQuotationResult>(cacheKey);
      if (cached) {
        return {
          items: cached.items.map((item) => this.deserializeQuote(item)),
          meta: cached.meta,
          lowestUnitPrice: cached.lowestUnitPrice,
        };
      }
    }

    const where: Prisma.SupplierQuoteWhereInput = {
      rfqId,
      isActive: true,
    };

    if (options.search && options.search.trim()) {
      where.name = { contains: options.search.trim(), mode: 'insensitive' };
    }

    let orderBy: Prisma.SupplierQuoteOrderByWithRelationInput = { unitPrice: 'asc' };
    if (options.sortBy === 'price_desc') {
      orderBy = { unitPrice: 'desc' };
    } else if (options.sortBy === 'lead_asc') {
      orderBy = { leadTime: 'asc' };
    } else if (options.sortBy === 'recent') {
      orderBy = { createdAt: 'desc' };
    }

    const [filteredTotal, minPriceAgg, records] = await this.prisma.$transaction([
      this.prisma.supplierQuote.count({ where }),
      this.prisma.supplierQuote.aggregate({
        where: { rfqId, isActive: true },
        _min: { unitPrice: true },
      }),
      this.prisma.supplierQuote.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(filteredTotal / limit) || 1;
    const lowestUnitPrice = minPriceAgg._min.unitPrice ? Number(minPriceAgg._min.unitPrice) : undefined;

    const result: PaginatedQuotationResult = {
      items: records.map((record) => this.mapToEntity(record)),
      meta: {
        page,
        limit,
        total: filteredTotal,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      lowestUnitPrice,
    };

    if (this.cacheService) {
      await this.cacheService.set(cacheKey, result, 60);
    }

    return result;
  }

  public async findAll(): Promise<SupplierQuoteEntity[]> {
    const records = await this.prisma.supplierQuote.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => this.mapToEntity(record));
  }

  public async create(data: CreateSupplierQuoteData): Promise<SupplierQuoteEntity> {
    const payload = {
      name: data.name,
      rfqId: data.rfqId,
      unitPrice: data.unitPrice,
      leadTime: data.leadTime,
      validUntil: data.validUntil,
    };

    const record = await this.prisma.supplierQuote.create({
      data: payload as unknown as Prisma.SupplierQuoteUncheckedCreateInput,
    });

    if (this.cacheService) {
      await Promise.all([
        this.cacheService.delByPattern(`quotations:rfq:${data.rfqId}:*`),
        this.cacheService.del(`rfqs:detail:${data.rfqId}`),
        this.cacheService.delByPattern('rfqs:list:*'),
      ]);
    }

    return this.mapToEntity(record);
  }

  public async delete(id: string): Promise<boolean> {
    try {
      const quote = await this.prisma.supplierQuote.findUnique({
        where: { id },
        select: { rfqId: true },
      });

      const result = await this.prisma.supplierQuote.updateMany({
        where: { id, isActive: true },
        data: { isActive: false },
      });

      if (result.count > 0 && quote && this.cacheService) {
        await Promise.all([
          this.cacheService.delByPattern(`quotations:rfq:${quote.rfqId}:*`),
          this.cacheService.del(`rfqs:detail:${quote.rfqId}`),
          this.cacheService.delByPattern('rfqs:list:*'),
        ]);
      }

      return result.count > 0;
    } catch {
      return false;
    }
  }

  public async deleteByRfqId(rfqId: string): Promise<number> {
    try {
      const result = await this.prisma.supplierQuote.updateMany({
        where: { rfqId, isActive: true },
        data: { isActive: false },
      });

      if (result.count > 0 && this.cacheService) {
        await Promise.all([
          this.cacheService.delByPattern(`quotations:rfq:${rfqId}:*`),
          this.cacheService.del(`rfqs:detail:${rfqId}`),
          this.cacheService.delByPattern('rfqs:list:*'),
        ]);
      }

      return result.count;
    } catch {
      return 0;
    }
  }

  private deserializeQuote(item: SerializedQuote): SupplierQuoteEntity {
    return new SupplierQuoteEntity({
      id: item.id,
      name: item.name,
      rfqId: item.rfqId,
      unitPrice: Number(item.unitPrice),
      leadTime: new Date(item.leadTime),
      validUntil: new Date(item.validUntil),
      isActive: item.isActive,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    });
  }

  private mapToEntity(record: {
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
  }): SupplierQuoteEntity {
    const resolvedName =
      typeof record.name === 'string'
        ? record.name
        : typeof record.supplierName === 'string'
          ? record.supplierName
          : '';

      const resolvedLeadTime =
      record.leadTime instanceof Date
        ? record.leadTime
        : new Date(String(record.leadTime));

    return new SupplierQuoteEntity({
      id: record.id,
      name: resolvedName,
      rfqId: record.rfqId,
      unitPrice: Number(record.unitPrice),
      leadTime: resolvedLeadTime,
      validUntil: record.validUntil,
      isActive: record.isActive !== undefined ? record.isActive : true,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
