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
      const userId = (req.query.userId as string) || undefined;
      const rfqs = userId
        ? await this.rfqUseCases.getRfqListByUserId(userId)
        : await this.rfqUseCases.getRfqList();

      res.status(200).json({
        success: true,
        data: rfqs.map((rfq) => ({
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
}
