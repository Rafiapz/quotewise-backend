import { IQuotationRepository } from '../../domain/repositories/quotation.repository.interface';
import { IRFQRepository } from '../../../rfq/domain/repositories/rfq.repository.interface';
import { CreateQuotationDTO } from '../dto/quotation.dto';
import { SupplierQuoteEntity } from '../../domain/entities/quotation.entity';
import { NotFoundError, DomainError } from '../../../../shared/errors/AppError';

/**
 * Use Case: Submit a quotation for an existing RFQ
 * Enforces business rules:
 * 1. Target RFQ must exist.
 * 2. Target RFQ must not be expired.
 * 3. Quotation validUntil date must be in the future.
 */
export class CreateQuotationUseCase {
  constructor(
    private readonly quotationRepository: IQuotationRepository,
    private readonly rfqRepository: IRFQRepository
  ) {}

  public async execute(dto: CreateQuotationDTO): Promise<SupplierQuoteEntity> {
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
}

/**
 * Use Case: Retrieve all supplier quotations submitted for a specific RFQ
 */
export class GetQuotationsByRfqUseCase {
  constructor(
    private readonly quotationRepository: IQuotationRepository,
    private readonly rfqRepository: IRFQRepository
  ) {}

  public async execute(rfqId: string): Promise<SupplierQuoteEntity[]> {
    const rfq = await this.rfqRepository.findById(rfqId);
    if (!rfq) {
      throw new NotFoundError(`RFQ with ID ${rfqId} not found`);
    }

    return this.quotationRepository.findByRfqId(rfqId);
  }
}
