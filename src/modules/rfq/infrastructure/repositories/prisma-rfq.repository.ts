import { Prisma, PrismaClient } from "@prisma/client";
import {
  IRFQRepository,
  CreateRFQData,
  UpdateRFQData,
  RfqFilterOptions,
  PaginatedRfqResult,
} from "../../domain/repositories/rfq.repository.interface";
import { RFQEntity } from "../../domain/entities/rfq.entity";

export interface PrismaRFQRepositoryConstructorParams {
  Prisma: PrismaClient;
}

export class PrismaRFQRepository implements IRFQRepository {
  private prisma: PrismaClient;

  constructor({
    Prisma,
  }: PrismaRFQRepositoryConstructorParams) {
    this.prisma = Prisma;
  }

  async findById(id: string): Promise<RFQEntity | null> {
    const record = await this.prisma.rFQ.findFirst({
      where: { id, isActive: true },
      include: {
        quotes: {
          where: { isActive: true },
        },
      },
    });

    if (!record) return null;
    return this.mapToEntity(record);
  }

  async findAll(options: RfqFilterOptions = {}): Promise<PaginatedRfqResult> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 9));
    const now = new Date();

    const where: Prisma.RFQWhereInput = {
      isActive: true,
    };

    if (options.userId) {
      where.userId = options.userId;
    }

    if (options.search && options.search.trim()) {
      const searchTerm = options.search.trim();
      where.OR = [
        { partNumber: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    if (options.status && options.status !== "ALL") {
      if (options.status === "EXPIRED") {
        where.neededBy = { lt: now };
      } else if (options.status === "QUOTED") {
        where.neededBy = { gte: now };
        where.quotes = { some: { isActive: true } };
      } else if (options.status === "OPEN") {
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
        orderBy: { createdAt: "desc" },
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
      stats: {
        total: totalCount,
        open: openCount,
        quoted: quotedCount,
        expired: expiredCount,
      },
    };
  }

  async create(data: CreateRFQData): Promise<RFQEntity> {
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

    return this.mapToEntity(record);
  }

  async update(id: string, data: UpdateRFQData): Promise<RFQEntity | null> {
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

      return this.mapToEntity(record);
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.prisma.rFQ.updateMany({
        where: { id, isActive: true },
        data: { isActive: false },
      });
      return result.count > 0;
    } catch {
      return false;
    }
  }

  private mapToEntity(record: any): RFQEntity {
    return RFQEntity.fromJSON(record);
  }
}
