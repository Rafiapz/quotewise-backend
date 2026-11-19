import { IRFQRepository } from '../../domain/repositories/rfq.repository.interface';
import { CreateRfqDTO } from '../dto/rfq.dto';
import { RFQEntity } from '../../domain/entities/rfq.entity';
import { NotFoundError, DomainError } from '../../../../shared/errors/AppError';

/**
 * RFQUseCases (Application Service)
 * Encapsulates all RFQ business use cases within a single cohesive class.
 * Adheres strictly to Clean Architecture by orchestrating domain entities
 * and repository interfaces with zero dependency on frameworks or databases.
 */
export class RFQUseCases {
  constructor(private readonly rfqRepository: IRFQRepository) {}

  /**
   * Use Case: Create a new Request for Quotation (RFQ)
   * Enforces business rule that neededBy deadline must be in the future.
   */
  public async createRfq(dto: CreateRfqDTO): Promise<RFQEntity> {
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

  /**
   * Use Case: Retrieve all RFQs with dynamic statuses and best quotation calculations
   */
  public async getRfqList(): Promise<RFQEntity[]> {
    return this.rfqRepository.findAll();
  }

  /**
   * Use Case: Retrieve a single RFQ by ID along with its supplier quotes
   */
  public async getRfqById(id: string): Promise<RFQEntity> {
    const rfq = await this.rfqRepository.findById(id);
    if (!rfq) {
      throw new NotFoundError(`RFQ with ID ${id} not found`);
    }
    return rfq;
  }
}
