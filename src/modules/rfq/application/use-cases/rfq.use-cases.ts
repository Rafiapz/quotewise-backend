import { IRFQRepository } from '../../domain/repositories/rfq.repository.interface';
import { CreateRfqDTO } from '../dto/rfq.dto';
import { RFQEntity } from '../../domain/entities/rfq.entity';
import { NotFoundError } from '../../../../shared/errors/AppError';

export class RFQUseCases {
  constructor(private readonly rfqRepository: IRFQRepository) {}

  public async createRfq(dto: CreateRfqDTO): Promise<RFQEntity> {
    return this.rfqRepository.create({
      partNumber: dto.partNumber,
      description: dto.description,
      quantity: dto.quantity,
      neededBy: new Date(dto.neededBy),
      userId: dto.userId,
    });
  }

  public async getRfqList(): Promise<RFQEntity[]> {
    return this.rfqRepository.findAll();
  }

  public async getRfqListByUserId(userId: string): Promise<RFQEntity[]> {
    return this.rfqRepository.findByUserId(userId);
  }

  public async getRfqById(id: string): Promise<RFQEntity> {
    const rfq = await this.rfqRepository.findById(id);
    if (!rfq) {
      throw new NotFoundError(`RFQ with ID ${id} not found`);
    }
    return rfq;
  }
}
