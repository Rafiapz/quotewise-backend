import { z } from 'zod';

/**
 * Presentation Layer HTTP Request Validation Schemas for Quotation Module.
 * Responsible for validating input format, type coercions, and HTTP constraints.
 */

export const createQuotationSchema = z.object({
  name: z.string({ required_error: 'Supplier name is required' }).min(1, 'Supplier name is required').max(200).trim(),
  rfqId: z.string({ required_error: 'Valid RFQ ID is required' }).uuid('Valid RFQ ID is required'),
  unitPrice: z.coerce.number({ required_error: 'Unit price is required' }).positive('Unit price must be a positive number'),
  leadTime: z.union([
    z.coerce.number().int().positive('Lead time in days must be a positive integer'),
    z.string().min(1, 'Lead time is required'),
  ]),
  validUntil: z
    .string({ required_error: 'Valid until date is required' })
    .min(1, 'Valid until date is required')
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'validUntil must be a valid date string',
    })
    .refine(
      (val) => {
        const parsed = new Date(val);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        return parsed >= startOfToday;
      },
      {
        message: 'Valid until date cannot be in the past',
      },
    ),
});

export const createQuotationForRfqBodySchema = createQuotationSchema.omit({ rfqId: true }).extend({
  rfqId: z.string().uuid('Valid RFQ ID is required').optional(),
});

export const quotationIdParamSchema = z.object({
  id: z.string({ required_error: 'Quotation ID is required' }).uuid('Invalid quotation ID format'),
});

export const rfqIdParamForQuotationSchema = z.object({
  rfqId: z.string({ required_error: 'RFQ ID is required' }).uuid('Invalid RFQ ID format'),
});

export const quotationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(6),
  search: z.string().optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'lead_asc', 'recent']).optional().default('price_asc'),
});

export const quotationListQuerySchema = quotationQuerySchema.extend({
  rfqId: z.string().uuid('Invalid RFQ ID format').optional(),
});

export type CreateQuotationBodyInput = z.infer<typeof createQuotationSchema>;
export type CreateQuotationForRfqBodyInput = z.infer<typeof createQuotationForRfqBodySchema>;
export type QuotationIdParamInput = z.infer<typeof quotationIdParamSchema>;
export type RfqIdParamForQuotationInput = z.infer<typeof rfqIdParamForQuotationSchema>;
export type QuotationQueryInput = z.infer<typeof quotationQuerySchema>;
export type QuotationListQueryInput = z.infer<typeof quotationListQuerySchema>;
