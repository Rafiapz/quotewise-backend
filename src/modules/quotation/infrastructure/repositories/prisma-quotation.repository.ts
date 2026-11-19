import { PrismaClient } from '@prisma/client';
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
    const record = await this.prisma.supplierQuote.create({
      data: {
        name: data.name,
        rfqId: data.rfqId,
        unitPrice: data.unitPrice,
        leadTime: data.leadTime,
        validUntil: data.validUntil,
      },
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
    name: string;
    rfqId: string;
    unitPrice: unknown;
    leadTime: Date;
    validUntil: Date;
    createdAt: Date;
    updatedAt: Date;
  }): SupplierQuoteEntity {
    return new SupplierQuoteEntity({
      id: record.id,
      name: record.name,
      rfqId: record.rfqId,
      unitPrice: Number(record.unitPrice),
      leadTime: record.leadTime,
      validUntil: record.validUntil,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
