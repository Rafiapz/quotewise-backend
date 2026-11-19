import {
  IQuotationRepository,
  QuotationFilterOptions,
  PaginatedQuotationResult,
} from '../../domain/repositories/quotation.repository.interface';
import { CreateQuotationDTO } from '../dto/quotation.dto';
import { SupplierQuoteEntity } from '../../domain/entities/quotation.entity';
import { NotFoundError } from '../../../../shared/errors/AppError';

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

  public async getQuotationsByRfq(
    rfqId: string,
    options?: QuotationFilterOptions
  ): Promise<PaginatedQuotationResult> {
    return this.quotationRepository.findByRfqId(rfqId, options);
  }

  public async getAllQuotations(): Promise<SupplierQuoteEntity[]> {
    return this.quotationRepository.findAll();
  }

  public async deleteQuotation(id: string): Promise<boolean> {
    const existing = await this.quotationRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Quotation with ID ${id} not found`);
    }

    const deleted = await this.quotationRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError(`Quotation with ID ${id} could not be deleted`);
    }

    return true;
  }
}
