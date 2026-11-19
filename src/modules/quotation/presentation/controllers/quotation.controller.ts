import { Request, Response, NextFunction } from 'express';
import { QuotationUseCases } from '../../application/use-cases/quotation.use-cases';
import { CreateQuotationDTO } from '../../application/dto/quotation.dto';

export class QuotationController {
  constructor(private readonly quotationUseCases: QuotationUseCases) {}

  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rfqId = req.query.rfqId as string | undefined;

      const quotes = rfqId
        ? await this.quotationUseCases.getQuotationsByRfq(rfqId)
        : await this.quotationUseCases.getAllQuotations();

      res.status(200).json({
        success: true,
        data: quotes.map((q) => ({
          id: q.id,
          name: q.name,
          rfqId: q.rfqId,
          unitPrice: q.unitPrice,
          leadTime: q.leadTime.toISOString(),
          validUntil: q.validUntil.toISOString(),
          createdAt: q.createdAt.toISOString(),
          updatedAt: q.updatedAt.toISOString(),
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  public getByRfq = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rfqId = req.params.rfqId || req.params.id;
      const quotes = await this.quotationUseCases.getQuotationsByRfq(rfqId);

      res.status(200).json({
        success: true,
        data: quotes.map((q) => ({
          id: q.id,
          name: q.name,
          rfqId: q.rfqId,
          unitPrice: q.unitPrice,
          leadTime: q.leadTime.toISOString(),
          validUntil: q.validUntil.toISOString(),
          createdAt: q.createdAt.toISOString(),
          updatedAt: q.updatedAt.toISOString(),
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto: CreateQuotationDTO = req.body;
      const quote = await this.quotationUseCases.createQuotation(dto);

      res.status(201).json({
        success: true,
        data: {
          id: quote.id,
          name: quote.name,
          rfqId: quote.rfqId,
          unitPrice: quote.unitPrice,
          leadTime: quote.leadTime.toISOString(),
          validUntil: quote.validUntil.toISOString(),
          createdAt: quote.createdAt.toISOString(),
          updatedAt: quote.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
