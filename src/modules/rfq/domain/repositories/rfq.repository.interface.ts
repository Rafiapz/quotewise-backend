import { RFQEntity } from '../entities/rfq.entity';
import { PaginationMeta } from '../../../../shared/types/pagination';

export interface CreateRFQData {
  partNumber: string;
  description: string;
  quantity: number;
  neededBy: Date;
  userId: string;
}

export interface UpdateRFQData {
  partNumber?: string;
  description?: string;
  quantity?: number;
  neededBy?: Date;
}

export interface RfqFilterOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'ALL' | 'OPEN' | 'QUOTED' | 'EXPIRED';
  userId?: string;
}

export interface RfqStats {
  total: number;
  open: number;
  quoted: number;
  expired: number;
}

export interface PaginatedRfqResult {
  items: RFQEntity[];
  meta: PaginationMeta;
  stats: RfqStats;
}

export interface IRFQRepository {
  findById(id: string): Promise<RFQEntity | null>;
  findAll(options?: RfqFilterOptions): Promise<PaginatedRfqResult>;
  create(data: CreateRFQData): Promise<RFQEntity>;
  update(id: string, data: UpdateRFQData): Promise<RFQEntity | null>;
  delete(id: string): Promise<boolean>;
}
