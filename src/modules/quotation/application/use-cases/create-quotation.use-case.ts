import { IQuotationRepository } from '../../domain/repositories/quotation.repository.interface';
import { IRFQRepository } from '../../../rfq/domain/repositories/rfq.repository.interface';
import { CreateQuotationDTO } from '../dto/quotation.dto';
import { SupplierQuoteEntity } from '../../domain/entities/quotation.entity';
import { NotFoundError } from '../../../../shared/errors/AppError';

export class CreateQuotationUseCase {
  constructor(
    private readonly quotationRepository: IQuotationRepository,
    private readonly rfqRepository: IRFQRepository
  ) {}

  public async execute(dto: CreateQuotationDTO): Promise<SupplierQuoteEntity> {
    const rfq = await this.rfqRepository.findById(dto.rfqId);
    if (!rfq) {
      throw new NotFoundError(`Cannot add quotation: RFQ with ID ${dto.rfqId} not found`);
    }

    return this.quotationRepository.create({
      rfqId: dto.rfqId,
      supplierName: dto.supplierName,
      unitPrice: dto.unitPrice,
      leadTime: dto.leadTime,
      validUntil: new Date(dto.validUntil),
    });
  }
}
