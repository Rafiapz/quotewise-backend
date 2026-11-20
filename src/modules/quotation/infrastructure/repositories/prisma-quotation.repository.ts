import { Prisma, PrismaClient } from "@prisma/client";
import {
  IQuotationRepository,
  CreateSupplierQuoteData,
  QuotationFilterOptions,
  PaginatedQuotationResult,
} from "../../domain/repositories/quotation.repository.interface";
import { SupplierQuoteEntity } from "../../domain/entities/quotation.entity";

export interface PrismaQuotationRepositoryConstructorParams {
  Prisma: PrismaClient;
}

export class PrismaQuotationRepository implements IQuotationRepository {
  private prisma: PrismaClient;

  constructor({
    Prisma,
  }: PrismaQuotationRepositoryConstructorParams) {
    this.prisma = Prisma;
  }

  async findById(id: string): Promise<SupplierQuoteEntity | null> {
    const record = await this.prisma.supplierQuote.findFirst({
      where: { id, isActive: true },
    });

    if (!record) return null;
    return this.mapToEntity(record);
  }

  async findByRfqId(
    rfqId: string,
    options: QuotationFilterOptions = {},
  ): Promise<PaginatedQuotationResult> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 6));

    const where: Prisma.SupplierQuoteWhereInput = {
      rfqId,
      isActive: true,
    };

    if (options.search && options.search.trim()) {
      where.name = { contains: options.search.trim(), mode: "insensitive" };
    }

    let orderBy: Prisma.SupplierQuoteOrderByWithRelationInput = {
      unitPrice: "asc",
    };
    if (options.sortBy === "price_desc") {
      orderBy = { unitPrice: "desc" };
    } else if (options.sortBy === "lead_asc") {
      orderBy = { leadTime: "asc" };
    } else if (options.sortBy === "recent") {
      orderBy = { createdAt: "desc" };
    }

    const isDefaultSort = !options.sortBy || options.sortBy === "price_asc";
    const isFirstPage = page === 1;
    const hasSearch = Boolean(options.search && options.search.trim());

    // Execute concurrently with Promise.all (no slow $transaction block)
    const [filteredTotal, records, minPriceAgg] = await Promise.all([
      this.prisma.supplierQuote.count({ where }),
      this.prisma.supplierQuote.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      // Only execute separate aggregate query if min price cannot be derived from page 1 records
      !hasSearch && isDefaultSort && isFirstPage
        ? Promise.resolve(null)
        : this.prisma.supplierQuote.aggregate({
            where: { rfqId, isActive: true },
            _min: { unitPrice: true },
          }),
    ]);

    const totalPages = Math.ceil(filteredTotal / limit) || 1;

    const lowestUnitPrice =
      minPriceAgg?._min?.unitPrice !== undefined && minPriceAgg?._min?.unitPrice !== null
        ? Number(minPriceAgg._min.unitPrice)
        : records.length > 0 && isDefaultSort && !hasSearch
        ? Number(records[0].unitPrice)
        : undefined;

    return {
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
  }

  async findAll(): Promise<SupplierQuoteEntity[]> {
    const records = await this.prisma.supplierQuote.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return records.map((record) => this.mapToEntity(record));
  }

  async create(data: CreateSupplierQuoteData): Promise<SupplierQuoteEntity> {
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

    return this.mapToEntity(record);
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.prisma.supplierQuote.updateMany({
        where: { id, isActive: true },
        data: { isActive: false },
      });
      return result.count > 0;
    } catch {
      return false;
    }
  }

  async deleteByRfqId(rfqId: string): Promise<number> {
    try {
      const result = await this.prisma.supplierQuote.updateMany({
        where: { rfqId, isActive: true },
        data: { isActive: false },
      });
      return result.count;
    } catch {
      return 0;
    }
  }

  private mapToEntity(record: any): SupplierQuoteEntity {
    return SupplierQuoteEntity.fromJSON(record);
  }
}
