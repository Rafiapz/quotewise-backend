import { IRFQRepository } from '../../domain/repositories/rfq.repository.interface';
import { RFQEntity } from '../../domain/entities/rfq.entity';

export class GetRfqListUseCase {
  constructor(private readonly rfqRepository: IRFQRepository) {}

  public async execute(): Promise<RFQEntity[]> {
    return this.rfqRepository.findAll();
  }
}
