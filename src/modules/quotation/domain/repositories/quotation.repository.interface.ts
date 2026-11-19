import { SupplierQuoteEntity } from '../entities/quotation.entity';
import { PaginationMeta } from '../../../../shared/types/pagination';

export interface CreateSupplierQuoteData {
  name: string;
  rfqId: string;
  unitPrice: number;
  leadTime: Date;
  validUntil: Date;
}

export interface QuotationFilterOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'lead_asc' | 'recent';
}

export interface PaginatedQuotationResult {
  items: SupplierQuoteEntity[];
  meta: PaginationMeta;
  lowestUnitPrice?: number;
}

export interface IQuotationRepository {
  findById(id: string): Promise<SupplierQuoteEntity | null>;
  findByRfqId(rfqId: string, options?: QuotationFilterOptions): Promise<PaginatedQuotationResult>;
  findAll(): Promise<SupplierQuoteEntity[]>;
  create(data: CreateSupplierQuoteData): Promise<SupplierQuoteEntity>;
  delete(id: string): Promise<boolean>;
  deleteByRfqId(rfqId: string): Promise<number>;
}
