import { SupplierQuoteEntity } from '../entities/quotation.entity';

export interface CreateSupplierQuoteData {
  rfqId: string;
  supplierName: string;
  unitPrice: number;
  leadTime: number;
  validUntil: Date;
}

export interface IQuotationRepository {
  findById(id: string): Promise<SupplierQuoteEntity | null>;
  findByRfqId(rfqId: string): Promise<SupplierQuoteEntity[]>;
  findAll(): Promise<SupplierQuoteEntity[]>;
  create(data: CreateSupplierQuoteData): Promise<SupplierQuoteEntity>;
  delete(id: string): Promise<boolean>;
}
