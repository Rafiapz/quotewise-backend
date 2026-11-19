import { IQuotationRepository } from '../../domain/repositories/quotation.repository.interface';
import { CreateQuotationDTO } from '../dto/quotation.dto';
import { SupplierQuoteEntity } from '../../domain/entities/quotation.entity';

export class QuotationUseCases {
  constructor(private readonly quotationRepository: IQuotationRepository) {}

  public async createQuotation(dto: CreateQuotationDTO): Promise<SupplierQuoteEntity> {
    let leadTimeDate: Date;

    if (typeof dto.leadTime === 'number') {
      leadTimeDate = new Date(Date.now() + dto.leadTime * 86400000);
    } else {
      const parsedNumber = Number(dto.leadTime);
      if (!isNaN(parsedNumber) && parsedNumber > 0 && !dto.leadTime.includes('-') && !dto.leadTime.includes('/')) {
        leadTimeDate = new Date(Date.now() + parsedNumber * 86400000);
      } else {
        leadTimeDate = new Date(dto.leadTime);
      }
    }

    return this.quotationRepository.create({
      name: dto.name,
      rfqId: dto.rfqId,
      unitPrice: dto.unitPrice,
      leadTime: leadTimeDate,
      validUntil: new Date(dto.validUntil),
    });
  }

  public async getQuotationsByRfq(rfqId: string): Promise<SupplierQuoteEntity[]> {
    return this.quotationRepository.findByRfqId(rfqId);
  }

  public async getAllQuotations(): Promise<SupplierQuoteEntity[]> {
    return this.quotationRepository.findAll();
  }
}
