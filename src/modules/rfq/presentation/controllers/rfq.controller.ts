import { Request, Response, NextFunction } from 'express';
import { RFQUseCases } from '../../application/use-cases/rfq.use-cases';
import { CreateRfqDTO } from '../../application/dto/rfq.dto';
import { UnauthorizedError } from '../../../../shared/errors/AppError';

const calculateLeadTimeDays = (leadTime: Date, createdAt: Date): number => {
  const diffMs = leadTime.getTime() - createdAt.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, days);
};

export class RFQController {
  constructor(private readonly rfqUseCases: RFQUseCases) {}

  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const search = (req.query.search as string) || undefined;
      const status = (req.query.status as 'ALL' | 'OPEN' | 'QUOTED' | 'EXPIRED') || undefined;
      const userId = (req.query.userId as string) || undefined;

      const result = await this.rfqUseCases.getRfqList({
        page,
        limit,
        search,
        status,
        userId,
      });

      res.status(200).json({
        success: true,
        data: result.items.map((rfq) => ({
          id: rfq.id,
          partNumber: rfq.partNumber,
          description: rfq.description,
          quantity: rfq.quantity,
          neededBy: rfq.neededBy.toISOString(),
          userId: rfq.userId,
          createdAt: rfq.createdAt.toISOString(),
          updatedAt: rfq.updatedAt.toISOString(),
          status: rfq.status,
          quoteCount: rfq.quoteCount,
          bestQuote: rfq.bestQuote
            ? {
                id: rfq.bestQuote.id,
                name: rfq.bestQuote.name,
                unitPrice: rfq.bestQuote.unitPrice,
                leadTime: rfq.bestQuote.leadTime.toISOString(),
                leadTimeDays: calculateLeadTimeDays(rfq.bestQuote.leadTime, rfq.bestQuote.createdAt),
                validUntil: rfq.bestQuote.validUntil.toISOString(),
              }
            : null,
        })),
        meta: result.meta,
        stats: result.stats,
      });
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rfq = await this.rfqUseCases.getRfqById(req.params.id);
      res.status(200).json({
        success: true,
        data: {
          id: rfq.id,
          partNumber: rfq.partNumber,
          description: rfq.description,
          quantity: rfq.quantity,
          neededBy: rfq.neededBy.toISOString(),
          userId: rfq.userId,
          createdAt: rfq.createdAt.toISOString(),
          updatedAt: rfq.updatedAt.toISOString(),
          status: rfq.status,
          quoteCount: rfq.quoteCount,
          bestQuote: rfq.bestQuote
            ? {
                id: rfq.bestQuote.id,
                name: rfq.bestQuote.name,
                unitPrice: rfq.bestQuote.unitPrice,
                leadTime: rfq.bestQuote.leadTime.toISOString(),
                leadTimeDays: calculateLeadTimeDays(rfq.bestQuote.leadTime, rfq.bestQuote.createdAt),
                validUntil: rfq.bestQuote.validUntil.toISOString(),
              }
            : null,
          quotes: rfq.quotes.map((q) => ({
            id: q.id,
            name: q.name,
            rfqId: q.rfqId,
            unitPrice: q.unitPrice,
            leadTime: q.leadTime.toISOString(),
            leadTimeDays: calculateLeadTimeDays(q.leadTime, q.createdAt),
            validUntil: q.validUntil.toISOString(),
            createdAt: q.createdAt.toISOString(),
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resolvedUserId = (req.body.userId as string | undefined) || req.user?.userId;
      if (!resolvedUserId) {
        throw new UnauthorizedError('User authentication required to create an RFQ');
      }

      const dto: CreateRfqDTO = {
        partNumber: String(req.body.partNumber),
        description: String(req.body.description),
        quantity: Number(req.body.quantity),
        neededBy: String(req.body.neededBy),
        userId: resolvedUserId,
      };

      const rfq = await this.rfqUseCases.createRfq(dto);
      res.status(201).json({
        success: true,
        message: 'RFQ created successfully',
        data: {
          id: rfq.id,
          partNumber: rfq.partNumber,
          description: rfq.description,
          quantity: rfq.quantity,
          neededBy: rfq.neededBy.toISOString(),
          userId: rfq.userId,
          createdAt: rfq.createdAt.toISOString(),
          updatedAt: rfq.updatedAt.toISOString(),
          status: rfq.status,
          quoteCount: rfq.quoteCount,
          bestQuote: null,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await this.rfqUseCases.updateRfq(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'RFQ updated successfully',
        data: {
          id: updated.id,
          partNumber: updated.partNumber,
          description: updated.description,
          quantity: updated.quantity,
          neededBy: updated.neededBy.toISOString(),
          userId: updated.userId,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          status: updated.status,
          quoteCount: updated.quoteCount,
          bestQuote: updated.bestQuote
            ? {
                id: updated.bestQuote.id,
                name: updated.bestQuote.name,
                unitPrice: updated.bestQuote.unitPrice,
                leadTime: updated.bestQuote.leadTime.toISOString(),
                leadTimeDays: calculateLeadTimeDays(updated.bestQuote.leadTime, updated.bestQuote.createdAt),
                validUntil: updated.bestQuote.validUntil.toISOString(),
              }
            : null,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.rfqUseCases.deleteRfq(req.params.id);
      res.status(200).json({
        success: true,
        message: 'RFQ and associated quotes deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
