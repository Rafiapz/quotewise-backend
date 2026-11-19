import { Prisma, PrismaClient } from '@prisma/client';
import {
  IQuotationRepository,
  CreateSupplierQuoteData,
} from '../../domain/repositories/quotation.repository.interface';
import { SupplierQuoteEntity } from '../../domain/entities/quotation.entity';

export class PrismaQuotationRepository implements IQuotationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<SupplierQuoteEntity | null> {
    const record = await this.prisma.supplierQuote.findFirst({
      where: { id, isActive: true },
    });

    if (!record) return null;
    return this.mapToEntity(record);
  }

  public async findByRfqId(rfqId: string): Promise<SupplierQuoteEntity[]> {
    const records = await this.prisma.supplierQuote.findMany({
      where: { rfqId, isActive: true },
      orderBy: { unitPrice: 'asc' },
    });

    return records.map((record) => this.mapToEntity(record));
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

    return this.mapToEntity(record);
  }

  public async delete(id: string): Promise<boolean> {
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
