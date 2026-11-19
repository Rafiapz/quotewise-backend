import { z } from 'zod';

/**
 * Presentation Layer HTTP Request Validation Schemas for RFQ Module.
 * Responsible for validating input format, type coercions, and HTTP constraints.
 */

export const createRfqSchema = z.object({
  partNumber: z.string({ required_error: 'Part number is required' }).min(1, 'Part number is required').max(100).trim(),
  description: z.string({ required_error: 'Description is required' }).min(1, 'Description is required').trim(),
  quantity: z.coerce.number({ required_error: 'Quantity is required' }).int().positive('Quantity must be a positive integer'),
  neededBy: z
    .string({ required_error: 'Needed by date is required' })
    .min(1, 'Needed by date is required')
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'neededBy must be a valid date string',
    }),
  userId: z.string().uuid('Valid user ID is required').optional(),
});

export const updateRfqSchema = createRfqSchema.partial().omit({ userId: true });

export const rfqIdParamSchema = z.object({
  id: z.string({ required_error: 'RFQ ID is required' }).uuid('Invalid RFQ ID format'),
});

export const rfqQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(9),
  search: z.string().optional(),
  status: z.enum(['ALL', 'OPEN', 'QUOTED', 'EXPIRED']).optional().default('ALL'),
  userId: z.string().uuid().optional(),
});

export type CreateRfqBodyInput = z.infer<typeof createRfqSchema>;
export type UpdateRfqBodyInput = z.infer<typeof updateRfqSchema>;
export type RfqIdParamInput = z.infer<typeof rfqIdParamSchema>;
export type RfqQueryInput = z.infer<typeof rfqQuerySchema>;
