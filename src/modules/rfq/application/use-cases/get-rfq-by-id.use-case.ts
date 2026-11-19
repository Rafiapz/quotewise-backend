import { IRFQRepository } from '../../domain/repositories/rfq.repository.interface';
import { RFQEntity } from '../../domain/entities/rfq.entity';
import { NotFoundError } from '../../../../shared/errors/AppError';

export class GetRfqByIdUseCase {
  constructor(private readonly rfqRepository: IRFQRepository) {}

  public async execute(id: string): Promise<RFQEntity> {
    const rfq = await this.rfqRepository.findById(id);
    if (!rfq) {
      throw new NotFoundError(`RFQ with ID ${id} not found`);
    }
    return rfq;
  }
}
