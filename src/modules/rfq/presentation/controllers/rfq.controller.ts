import { Request, Response, NextFunction } from "express";
import { RFQUseCases } from "../../application/use-cases/rfq.use-cases";
import { CreateRfqDTO } from "../../application/dto/rfq.dto";
import { UnauthorizedError } from "../../../../shared/errors/AppError";
import { calculateLeadTimeDays } from "../../../../shared/utils/date.utils";

export interface RFQControllerConstructorParams {
  RFQUseCases: RFQUseCases;
}

export class RFQController {
  private rfqUseCases: RFQUseCases;

  constructor({
    RFQUseCases,
  }: RFQControllerConstructorParams) {
    this.rfqUseCases = RFQUseCases;
  }

  /**
   * Asserts that the user is authenticated and returns their userId.
   * Throws UnauthorizedError if authentication is missing.
   */
  private requireUserId(req: Request, action = "perform this action"): string {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError(`User authentication required to ${action}`);
    }
    return userId;
  }

  getAll = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const search = (req.query.search as string) || undefined;
      const status =
        (req.query.status as "ALL" | "OPEN" | "QUOTED" | "EXPIRED") ||
        undefined;
      const userId = this.requireUserId(req, "view RFQs");

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
                leadTimeDays: calculateLeadTimeDays(
                  rfq.bestQuote.leadTime,
                  rfq.bestQuote.createdAt,
                ),
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

  getById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.requireUserId(req, "view this RFQ");
      const rfq = await this.rfqUseCases.getRfqById(req.params.id, userId);

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
                leadTimeDays: calculateLeadTimeDays(
                  rfq.bestQuote.leadTime,
                  rfq.bestQuote.createdAt,
                ),
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

  create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.requireUserId(req, "create an RFQ");

      const dto: CreateRfqDTO = {
        partNumber: String(req.body.partNumber),
        description: String(req.body.description),
        quantity: Number(req.body.quantity),
        neededBy: String(req.body.neededBy),
        userId,
      };

      const rfq = await this.rfqUseCases.createRfq(dto);
      res.status(201).json({
        success: true,
        message: "RFQ created successfully",
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

  update = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.requireUserId(req, "update this RFQ");
      const updated = await this.rfqUseCases.updateRfq(
        req.params.id,
        req.body,
        userId,
      );

      res.status(200).json({
        success: true,
        message: "RFQ updated successfully",
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
                leadTimeDays: calculateLeadTimeDays(
                  updated.bestQuote.leadTime,
                  updated.bestQuote.createdAt,
                ),
                validUntil: updated.bestQuote.validUntil.toISOString(),
              }
            : null,
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
      const userId = this.requireUserId(req, "delete this RFQ");
      await this.rfqUseCases.deleteRfq(req.params.id, userId);

      res.status(200).json({
        success: true,
        message: "RFQ and associated quotes deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };
}
