import { IQuotationRepository } from '../../domain/repositories/quotation.repository.interface';
import { IRFQRepository } from '../../../rfq/domain/repositories/rfq.repository.interface';
import { CreateQuotationDTO } from '../dto/quotation.dto';
import { SupplierQuoteEntity } from '../../domain/entities/quotation.entity';
import { NotFoundError, DomainError } from '../../../../shared/errors/AppError';

/**
 * QuotationUseCases (Application Service)
 * Encapsulates all Quotation business use cases within a single cohesive class.
 * Adheres strictly to Clean Architecture by orchestrating domain entities
 * and repository interfaces with zero dependency on frameworks or databases.
 */
export class QuotationUseCases {
  constructor(
    private readonly quotationRepository: IQuotationRepository,
    private readonly rfqRepository: IRFQRepository
  ) {}

  /**
   * Use Case: Submit a quotation for an existing RFQ
   * Business rules:
   * 1. Target RFQ must exist.
   * 2. Target RFQ must not be expired.
   * 3. Quotation validUntil date must be in the future.
   */
  public async createQuotation(dto: CreateQuotationDTO): Promise<SupplierQuoteEntity> {
    const rfq = await this.rfqRepository.findById(dto.rfqId);
    if (!rfq) {
      throw new NotFoundError(`Cannot add quotation: RFQ with ID ${dto.rfqId} not found.`);
    }

    if (!rfq.canAcceptQuotes()) {
      throw new DomainError(`Cannot submit quotation: RFQ ${rfq.partNumber} deadline has expired.`);
    }

    const validUntilDate = new Date(dto.validUntil);
    const now = new Date();
    if (validUntilDate.getTime() <= now.getTime()) {
      throw new DomainError('Quotation validUntil date must be in the future.');
    }

    return this.quotationRepository.create({
      rfqId: dto.rfqId,
      supplierName: dto.supplierName.trim(),
      unitPrice: dto.unitPrice,
      leadTime: dto.leadTime,
      validUntil: validUntilDate,
    });
  }

  /**
   * Use Case: Retrieve all supplier quotations submitted for a specific RFQ
   */
  public async getQuotationsByRfq(rfqId: string): Promise<SupplierQuoteEntity[]> {
    const rfq = await this.rfqRepository.findById(rfqId);
    if (!rfq) {
      throw new NotFoundError(`RFQ with ID ${rfqId} not found`);
    }

    return this.quotationRepository.findByRfqId(rfqId);
  }

  /**
   * Use Case: Retrieve all supplier quotations across all RFQs
   */
  public async getAllQuotations(): Promise<SupplierQuoteEntity[]> {
    return this.quotationRepository.findAll();
  }
}
