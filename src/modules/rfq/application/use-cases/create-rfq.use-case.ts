import { IRFQRepository } from '../../domain/repositories/rfq.repository.interface';
import { CreateRfqDTO } from '../dto/rfq.dto';
import { RFQEntity } from '../../domain/entities/rfq.entity';
import { DomainError } from '../../../../shared/errors/AppError';

export class CreateRfqUseCase {
  constructor(private readonly rfqRepository: IRFQRepository) {}

  public async execute(dto: CreateRfqDTO): Promise<RFQEntity> {
    const neededByDate = new Date(dto.neededBy);
    const now = new Date();

    if (neededByDate.getTime() <= now.getTime()) {
      throw new DomainError('RFQ neededBy deadline must be set to a future date.');
    }

    return this.rfqRepository.create({
      partNumber: dto.partNumber.trim().toUpperCase(),
      description: dto.description.trim(),
      quantity: dto.quantity,
      neededBy: neededByDate,
    });
  }
}
