/**
 * Pure Application Layer Data Transfer Objects (DTOs) for Quotation Module.
 * Decoupled from HTTP libraries, validation frameworks (Zod), and database models.
 */

export interface CreateQuotationDTO {
  name: string;
  rfqId: string;
  unitPrice: number;
  leadTime: number | string;
  validUntil: string;
}

export interface CreateQuotationForRfqBodyDTO {
  name: string;
  rfqId?: string;
  unitPrice: number;
  leadTime: number | string;
  validUntil: string;
}

export interface QuotationIdParamDTO {
  id: string;
}

export interface RfqIdParamForQuotationDTO {
  rfqId: string;
}

export interface QuotationQueryDTO {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'lead_asc' | 'recent';
}

export interface QuotationListQueryDTO extends QuotationQueryDTO {
  rfqId?: string;
}

export interface SupplierQuoteResponseDTO {
  id: string;
  name: string;
  rfqId: string;
  unitPrice: number;
  leadTime: string;
  leadTimeDays: number;
  validUntil: string;
  isBestPrice?: boolean;
  createdAt: string;
  updatedAt: string;
}
