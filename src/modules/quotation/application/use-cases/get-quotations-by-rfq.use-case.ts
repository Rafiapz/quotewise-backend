import { IQuotationRepository } from '../../domain/repositories/quotation.repository.interface';
import { IRFQRepository } from '../../../rfq/domain/repositories/rfq.repository.interface';
import { SupplierQuoteEntity } from '../../domain/entities/quotation.entity';
import { NotFoundError } from '../../../../shared/errors/AppError';

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
