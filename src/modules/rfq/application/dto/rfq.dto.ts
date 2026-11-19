import { z } from 'zod';

export const createRfqSchema = z.object({
  partNumber: z.string().min(1, 'Part number is required').max(100),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  neededBy: z.string().datetime({ message: 'neededBy must be a valid ISO 8601 date string' }),
  userId: z.string().uuid('Valid user ID is required'),
});

export const updateRfqSchema = createRfqSchema.partial().omit({ userId: true });

export const rfqIdParamSchema = z.object({
  id: z.string().uuid('Invalid RFQ ID format'),
});

export type CreateRfqDTO = z.infer<typeof createRfqSchema>;
export type UpdateRfqDTO = z.infer<typeof updateRfqSchema>;
export type RfqIdParamDTO = z.infer<typeof rfqIdParamSchema>;

export interface RfqResponseDTO {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  neededBy: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  quoteCount: number;
  bestQuote?: {
    id: string;
    name: string;
    unitPrice: number;
    leadTime: string;
    validUntil: string;
  } | null;
}
