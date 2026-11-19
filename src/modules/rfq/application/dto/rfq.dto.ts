/**
 * Pure Application Layer Data Transfer Objects (DTOs) for RFQ Module.
 * Decoupled from HTTP libraries, validation frameworks (Zod), and database models.
 */

export interface CreateRfqDTO {
  partNumber: string;
  description: string;
  quantity: number;
  neededBy: string;
  userId: string;
}

export interface UpdateRfqDTO {
  partNumber?: string;
  description?: string;
  quantity?: number;
  neededBy?: string;
}

export interface RfqIdParamDTO {
  id: string;
}

export interface RfqQueryDTO {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'ALL' | 'OPEN' | 'QUOTED' | 'EXPIRED';
  userId?: string;
}

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
    leadTimeDays: number;
    validUntil: string;
  } | null;
}
