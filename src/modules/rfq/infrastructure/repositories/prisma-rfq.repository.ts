import { PrismaClient } from '@prisma/client';
import {
  IRFQRepository,
  CreateRFQData,
  UpdateRFQData,
} from '../../domain/repositories/rfq.repository.interface';
import { RFQEntity } from '../../domain/entities/rfq.entity';
import { SupplierQuoteEntity } from '../../../quotation/domain/entities/quotation.entity';

export class PrismaRFQRepository implements IRFQRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<RFQEntity | null> {
    const record = await this.prisma.rFQ.findUnique({
      where: { id },
      include: { quotes: true },
    });

    if (!record) return null;
    return this.mapToEntity(record);
  }

  public async findAll(): Promise<RFQEntity[]> {
    const records = await this.prisma.rFQ.findMany({
      include: { quotes: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => this.mapToEntity(record));
  }

  public async findByUserId(userId: string): Promise<RFQEntity[]> {
    const records = await this.prisma.rFQ.findMany({
      where: { userId },
      include: { quotes: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => this.mapToEntity(record));
  }

  public async create(data: CreateRFQData): Promise<RFQEntity> {
    const record = await this.prisma.rFQ.create({
      data: {
        partNumber: data.partNumber,
        description: data.description,
        quantity: data.quantity,
        neededBy: data.neededBy,
        userId: data.userId,
      },
      include: { quotes: true },
    });

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
        include: { quotes: true },
      });

      return this.mapToEntity(record);
    } catch {
      return null;
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.rFQ.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  private mapToEntity(record: {
    id: string;
    partNumber: string;
    description: string;
    quantity: number;
    neededBy: Date;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    quotes?: Array<{
      id: string;
      rfqId: string;
      unitPrice: unknown;
      validUntil: Date;
      createdAt: Date;
      updatedAt: Date;
      name?: string;
      supplierName?: string;
      leadTime?: Date | number;
    }>;
  }): RFQEntity {
    const quoteEntities = (record.quotes || []).map(
      (q) =>
        new SupplierQuoteEntity({
          id: q.id,
          name: q.name ?? q.supplierName ?? '',
          rfqId: q.rfqId,
          unitPrice: Number(q.unitPrice),
          leadTime: q.leadTime instanceof Date ? q.leadTime : new Date(),
          validUntil: q.validUntil,
          createdAt: q.createdAt,
          updatedAt: q.updatedAt,
        })
    );

    return new RFQEntity({
      id: record.id,
      partNumber: record.partNumber,
      description: record.description,
      quantity: record.quantity,
      neededBy: record.neededBy,
      userId: record.userId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      quotes: quoteEntities,
    });
  }
}
