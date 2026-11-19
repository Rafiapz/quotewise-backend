import { RFQEntity } from '../entities/rfq.entity';

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

export interface IRFQRepository {
  findById(id: string): Promise<RFQEntity | null>;
  findAll(): Promise<RFQEntity[]>;
  findByUserId(userId: string): Promise<RFQEntity[]>;
  create(data: CreateRFQData): Promise<RFQEntity>;
  update(id: string, data: UpdateRFQData): Promise<RFQEntity | null>;
  delete(id: string): Promise<boolean>;
}
