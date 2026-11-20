import {
  IQuotationRepository,
  QuotationFilterOptions,
  PaginatedQuotationResult,
} from "../../domain/repositories/quotation.repository.interface";
import { IRFQRepository } from "../../../rfq/domain/repositories/rfq.repository.interface";
import { CreateQuotationDTO } from "../dto/quotation.dto";
import { SupplierQuoteEntity } from "../../domain/entities/quotation.entity";
import { NotFoundError, ForbiddenError, ValidationError } from "../../../../shared/errors/AppError";
import { calculateLeadTimeDate } from "../../../../shared/utils/date.utils";

export interface QuotationUseCasesConstructorParams {
  QuotationRepository: IQuotationRepository;
  RFQRepository?: IRFQRepository;
}

export class QuotationUseCases {
  private quotationRepository: IQuotationRepository;
  private rfqRepository?: IRFQRepository;

  constructor({
    QuotationRepository,
    RFQRepository,
  }: QuotationUseCasesConstructorParams) {
    this.quotationRepository = QuotationRepository;
    this.rfqRepository = RFQRepository;
  }

  async createQuotation(
    dto: CreateQuotationDTO,
    requestingUserId?: string,
  ): Promise<SupplierQuoteEntity> {
    if (this.rfqRepository && requestingUserId) {
      const rfq = await this.rfqRepository.findById(dto.rfqId);
      if (!rfq) {
        throw new NotFoundError(`RFQ with ID ${dto.rfqId} not found`);
      }
      if (rfq.userId !== requestingUserId) {
        throw new ForbiddenError(
          "You do not have permission to add quotations to this RFQ",
        );
      }
    }

    const validUntilDate = new Date(dto.validUntil);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (validUntilDate < startOfToday) {
      throw new ValidationError("Valid until date cannot be in the past", {
        validUntil: ["Valid until date cannot be in the past"],
      });
    }

    const leadTimeDate = calculateLeadTimeDate(dto.leadTime);

    return this.quotationRepository.create({
      name: dto.name,
      rfqId: dto.rfqId,
      unitPrice: dto.unitPrice,
      leadTime: leadTimeDate,
      validUntil: validUntilDate,
    });
  }

  async getQuotationsByRfq(
    rfqId: string,
    options?: QuotationFilterOptions,
    requestingUserId?: string,
  ): Promise<PaginatedQuotationResult> {
    if (this.rfqRepository && requestingUserId) {
      const rfq = await this.rfqRepository.findById(rfqId);
      if (!rfq) {
        throw new NotFoundError(`RFQ with ID ${rfqId} not found`);
      }
      if (rfq.userId !== requestingUserId) {
        throw new ForbiddenError(
          "You do not have access to this RFQ's quotations",
        );
      }
    }

    return this.quotationRepository.findByRfqId(rfqId, options);
  }

  async getQuotationById(id: string): Promise<SupplierQuoteEntity> {
    const quote = await this.quotationRepository.findById(id);
    if (!quote) {
      throw new NotFoundError(`Quotation with ID ${id} not found`);
    }
    return quote;
  }

  async getAllQuotations(
    requestingUserId?: string,
  ): Promise<SupplierQuoteEntity[]> {
    if (this.rfqRepository && requestingUserId) {
      const userRfqs = await this.rfqRepository.findAll({
        userId: requestingUserId,
        limit: 1000,
      });
      const userRfqIds = new Set(userRfqs.items.map((r) => r.id));
      const quotes = await this.quotationRepository.findAll();
      return quotes.filter((q) => userRfqIds.has(q.rfqId));
    }

    return this.quotationRepository.findAll();
  }

  async deleteQuotation(
    id: string,
    requestingUserId?: string,
  ): Promise<boolean> {
    const existing = await this.quotationRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Quotation with ID ${id} not found`);
    }

    if (this.rfqRepository && requestingUserId) {
      const rfq = await this.rfqRepository.findById(existing.rfqId);
      if (rfq && rfq.userId !== requestingUserId) {
        throw new ForbiddenError(
          "You do not have permission to delete quotations for this RFQ",
        );
      }
    }

    const deleted = await this.quotationRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError(`Quotation with ID ${id} could not be deleted`);
    }

    return true;
  }
}
