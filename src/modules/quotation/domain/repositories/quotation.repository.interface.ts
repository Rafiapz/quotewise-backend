import { SupplierQuoteEntity } from '../entities/quotation.entity';

export interface CreateSupplierQuoteData {
  name: string;
  rfqId: string;
  unitPrice: number;
  leadTime: Date;
  validUntil: Date;
}

export interface IQuotationRepository {
  findById(id: string): Promise<SupplierQuoteEntity | null>;
  findByRfqId(rfqId: string): Promise<SupplierQuoteEntity[]>;
  findAll(): Promise<SupplierQuoteEntity[]>;
  create(data: CreateSupplierQuoteData): Promise<SupplierQuoteEntity>;
  delete(id: string): Promise<boolean>;
}
