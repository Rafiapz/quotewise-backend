import { Request, Response, NextFunction } from "express";
import { QuotationUseCases } from "../../application/use-cases/quotation.use-cases";
import { CreateQuotationDTO } from "../../application/dto/quotation.dto";
import { RFQUseCases } from "../../../rfq/application/use-cases/rfq.use-cases";
import { calculateLeadTimeDays } from "../../../../shared/utils/date.utils";

export interface QuotationControllerConstructorParams {
  QuotationUseCases: QuotationUseCases;
  RFQUseCases?: RFQUseCases;
}

export class QuotationController {
  private quotationUseCases: QuotationUseCases;

  constructor({
    QuotationUseCases,
  }: QuotationControllerConstructorParams) {
    this.quotationUseCases = QuotationUseCases;
  }

  getAll = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const rfqId = req.query.rfqId as string | undefined;
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const search = (req.query.search as string) || undefined;
      const sortBy =
        (req.query.sortBy as
          | "price_asc"
          | "price_desc"
          | "lead_asc"
          | "recent") || undefined;

      if (rfqId) {
        const result = await this.quotationUseCases.getQuotationsByRfq(
          rfqId,
          { page, limit, search, sortBy },
          req.user?.userId,
        );

        res.status(200).json({
          success: true,
          data: result.items.map((q) => ({
            id: q.id,
            name: q.name,
            rfqId: q.rfqId,
            unitPrice: q.unitPrice,
            leadTime: q.leadTime.toISOString(),
            leadTimeDays: calculateLeadTimeDays(q.leadTime, q.createdAt),
            validUntil: q.validUntil.toISOString(),
            createdAt: q.createdAt.toISOString(),
            updatedAt: q.updatedAt.toISOString(),
            isBestPrice:
              result.lowestUnitPrice !== undefined &&
              q.unitPrice === result.lowestUnitPrice,
          })),
          meta: result.meta,
          lowestUnitPrice: result.lowestUnitPrice,
        });
        return;
      }

      const quotes = await this.quotationUseCases.getAllQuotations(
        req.user?.userId,
      );

      res.status(200).json({
        success: true,
        data: quotes.map((q) => ({
          id: q.id,
          name: q.name,
          rfqId: q.rfqId,
          unitPrice: q.unitPrice,
          leadTime: q.leadTime.toISOString(),
          leadTimeDays: calculateLeadTimeDays(q.leadTime, q.createdAt),
          validUntil: q.validUntil.toISOString(),
          createdAt: q.createdAt.toISOString(),
          updatedAt: q.updatedAt.toISOString(),
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  getByRfq = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const rfqId = req.params?.rfqId || req.params?.id;
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const search = (req.query.search as string) || undefined;
      const sortBy =
        (req.query.sortBy as
          | "price_asc"
          | "price_desc"
          | "lead_asc"
          | "recent") || undefined;

      const result = await this.quotationUseCases.getQuotationsByRfq(
        rfqId,
        { page, limit, search, sortBy },
        req.user?.userId,
      );

      res.status(200).json({
        success: true,
        data: result.items.map((q) => ({
          id: q.id,
          name: q.name,
          rfqId: q.rfqId,
          unitPrice: q.unitPrice,
          leadTime: q.leadTime.toISOString(),
          leadTimeDays: calculateLeadTimeDays(q.leadTime, q.createdAt),
          validUntil: q.validUntil.toISOString(),
          createdAt: q.createdAt.toISOString(),
          updatedAt: q.updatedAt.toISOString(),
          isBestPrice:
            result.lowestUnitPrice !== undefined &&
            q.unitPrice === result.lowestUnitPrice,
        })),
        meta: result.meta,
        lowestUnitPrice: result.lowestUnitPrice,
      });
    } catch (error) {
      next(error);
    }
  };

  create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const rfqId = String(req.params?.rfqId || req.body?.rfqId);

      const dto: CreateQuotationDTO = {
        name: String(req.body.name),
        rfqId,
        unitPrice: Number(req.body.unitPrice),
        leadTime: req.body.leadTime,
        validUntil: String(req.body.validUntil),
      };

      const quote = await this.quotationUseCases.createQuotation(
        dto,
        req.user?.userId,
      );

      res.status(201).json({
        success: true,
        message: "Supplier quotation added successfully",
        data: {
          id: quote.id,
          name: quote.name,
          rfqId: quote.rfqId,
          unitPrice: quote.unitPrice,
          leadTime: quote.leadTime.toISOString(),
          leadTimeDays: calculateLeadTimeDays(quote.leadTime, quote.createdAt),
          validUntil: quote.validUntil.toISOString(),
          createdAt: quote.createdAt.toISOString(),
          updatedAt: quote.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this.quotationUseCases.deleteQuotation(
        req.params.id,
        req.user?.userId,
      );

      res.status(200).json({
        success: true,
        message: "Supplier quotation deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };
}
