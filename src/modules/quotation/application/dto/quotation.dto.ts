import { z } from 'zod';

export const createQuotationSchema = z.object({
  name: z.string().min(1, 'Supplier quote name is required').max(200),
  rfqId: z.string().uuid('Valid RFQ ID is required'),
  unitPrice: z.number().positive('Unit price must be a positive number'),
  leadTime: z.string().datetime({ message: 'leadTime must be a valid ISO 8601 date string' }),
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
  name: string;
  rfqId: string;
  unitPrice: number;
  leadTime: string;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
}
