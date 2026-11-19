import { Prisma, PrismaClient } from '@prisma/client';
import {
  IQuotationRepository,
  CreateSupplierQuoteData,
} from '../../domain/repositories/quotation.repository.interface';
import { SupplierQuoteEntity } from '../../domain/entities/quotation.entity';

export class PrismaQuotationRepository implements IQuotationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<SupplierQuoteEntity | null> {
    const record = await this.prisma.supplierQuote.findUnique({
      where: { id },
    });

    if (!record) return null;
    return this.mapToEntity(record);
  }

  public async findByRfqId(rfqId: string): Promise<SupplierQuoteEntity[]> {
    const records = await this.prisma.supplierQuote.findMany({
      where: { rfqId },
      orderBy: { unitPrice: 'asc' },
    });

    return records.map((record) => this.mapToEntity(record));
  }

  public async findAll(): Promise<SupplierQuoteEntity[]> {
    const records = await this.prisma.supplierQuote.findMany({
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
      await this.prisma.supplierQuote.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  private mapToEntity(record: {
    id: string;
    rfqId: string;
    unitPrice: unknown;
    validUntil: Date;
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
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
