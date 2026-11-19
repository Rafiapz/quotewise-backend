import { z } from 'zod';

export const createQuotationSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(200).trim(),
  rfqId: z.string().uuid('Valid RFQ ID is required'),
  unitPrice: z.coerce.number().positive('Unit price must be a positive number'),
  leadTime: z.union([
    z.coerce.number().int().positive('Lead time in days must be a positive integer'),
    z.string().min(1, 'Lead time is required'),
  ]),
  validUntil: z
    .string()
    .min(1, 'Valid until date is required')
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'validUntil must be a valid date string',
    }),
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
  leadTimeDays: number;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
}
