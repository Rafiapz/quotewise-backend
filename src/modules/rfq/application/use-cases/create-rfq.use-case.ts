import { IRFQRepository } from '../../domain/repositories/rfq.repository.interface';
import { CreateRfqDTO } from '../dto/rfq.dto';
import { RFQEntity } from '../../domain/entities/rfq.entity';

export class CreateRfqUseCase {
  constructor(private readonly rfqRepository: IRFQRepository) {}

  public async execute(dto: CreateRfqDTO): Promise<RFQEntity> {
    const neededByDate = new Date(dto.neededBy);

    return this.rfqRepository.create({
      partNumber: dto.partNumber,
      description: dto.description,
      quantity: dto.quantity,
      neededBy: neededByDate,
    });
  }
}
