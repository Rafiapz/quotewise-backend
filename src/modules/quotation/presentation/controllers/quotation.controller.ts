import { Request, Response, NextFunction } from 'express';
import {
  CreateQuotationUseCase,
  GetQuotationsByRfqUseCase,
} from '../../application/use-cases/quotation.use-cases';
import { IQuotationRepository } from '../../domain/repositories/quotation.repository.interface';
import { CreateQuotationDTO } from '../../application/dto/quotation.dto';

export class QuotationController {
  constructor(
    private readonly createQuotationUseCase: CreateQuotationUseCase,
    private readonly getQuotationsByRfqUseCase: GetQuotationsByRfqUseCase,
    private readonly quotationRepository: IQuotationRepository
  ) {}

  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rfqId = req.query.rfqId as string | undefined;

      const quotes = rfqId
        ? await this.getQuotationsByRfqUseCase.execute(rfqId)
        : await this.quotationRepository.findAll();

      res.status(200).json({
        success: true,
        data: quotes.map((q) => ({
          id: q.id,
          rfqId: q.rfqId,
          supplierName: q.supplierName,
          unitPrice: q.unitPrice,
          leadTime: q.leadTime,
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
      const quotes = await this.getQuotationsByRfqUseCase.execute(rfqId);

      res.status(200).json({
        success: true,
        data: quotes.map((q) => ({
          id: q.id,
          rfqId: q.rfqId,
          supplierName: q.supplierName,
          unitPrice: q.unitPrice,
          leadTime: q.leadTime,
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
      const quote = await this.createQuotationUseCase.execute(dto);

      res.status(201).json({
        success: true,
        data: {
          id: quote.id,
          rfqId: quote.rfqId,
          supplierName: quote.supplierName,
          unitPrice: quote.unitPrice,
          leadTime: quote.leadTime,
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
