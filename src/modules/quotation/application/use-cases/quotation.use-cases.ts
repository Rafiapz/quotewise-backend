import { IQuotationRepository } from '../../domain/repositories/quotation.repository.interface';
import { CreateQuotationDTO } from '../dto/quotation.dto';
import { SupplierQuoteEntity } from '../../domain/entities/quotation.entity';

export class QuotationUseCases {
  constructor(private readonly quotationRepository: IQuotationRepository) {}

  public async createQuotation(dto: CreateQuotationDTO): Promise<SupplierQuoteEntity> {
    return this.quotationRepository.create({
      name: dto.name,
      rfqId: dto.rfqId,
      unitPrice: dto.unitPrice,
      leadTime: new Date(dto.leadTime),
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
