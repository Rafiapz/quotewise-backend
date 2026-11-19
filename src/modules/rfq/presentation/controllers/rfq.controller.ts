import { Request, Response, NextFunction } from 'express';
import { RFQUseCases } from '../../application/use-cases/rfq.use-cases';
import { CreateRfqDTO } from '../../application/dto/rfq.dto';

export class RFQController {
  constructor(private readonly rfqUseCases: RFQUseCases) {}

  public getAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rfqs = await this.rfqUseCases.getRfqList();
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
                validUntil: rfq.bestQuote.validUntil.toISOString(),
              }
            : null,
          quotes: rfq.quotes.map((q) => ({
            id: q.id,
            name: q.name,
            rfqId: q.rfqId,
            unitPrice: q.unitPrice,
            leadTime: q.leadTime.toISOString(),
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
      const dto: CreateRfqDTO = req.body;
      const rfq = await this.rfqUseCases.createRfq(dto);
      res.status(201).json({
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
          bestQuote: null,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
