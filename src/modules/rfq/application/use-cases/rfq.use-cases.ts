import { IRFQRepository } from '../../domain/repositories/rfq.repository.interface';
import { CreateRfqDTO } from '../dto/rfq.dto';
import { RFQEntity } from '../../domain/entities/rfq.entity';
import { NotFoundError, DomainError } from '../../../../shared/errors/AppError';

/**
 * Use Case: Create a new Request for Quotation (RFQ)
 * Enforces business rule that neededBy deadline must be in the future.
 */
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

/**
 * Use Case: Retrieve all RFQs with dynamic statuses and quotation counts
 */
export class GetRfqListUseCase {
  constructor(private readonly rfqRepository: IRFQRepository) {}

  public async execute(): Promise<RFQEntity[]> {
    return this.rfqRepository.findAll();
  }
}

/**
 * Use Case: Retrieve a single RFQ by ID along with its supplier quotes
 */
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
