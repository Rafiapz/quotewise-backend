import { z } from 'zod';

export const createQuotationSchema = z.object({
  rfqId: z.string().uuid('Valid RFQ ID is required'),
  supplierName: z.string().min(1, 'Supplier name is required').max(200),
  unitPrice: z.number().positive('Unit price must be a positive number'),
  leadTime: z.number().int().positive('Lead time in days must be a positive integer'),
  validUntil: z.string().datetime({ message: 'validUntil must be a valid ISO 8601 date string' }),
});

export const quotationIdParamSchema = z.object({
  id: z.string().uuid('Invalid quotation ID format'),
});

export const rfqIdParamForQuotationSchema = z.object({
  rfqId: z.string().uuid('Invalid RFQ ID format'),
});

export type CreateQuotationDTO = z.infer<typeof createQuotationSchema>;
export type QuotationIdParamDTO = z.infer<typeof quotationIdParamSchema>;

export interface SupplierQuoteResponseDTO {
  id: string;
  rfqId: string;
  supplierName: string;
  unitPrice: number;
  leadTime: number;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
}
