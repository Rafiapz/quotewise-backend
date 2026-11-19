import { describe, it, expect, vi } from 'vitest';
import { CreateRfqUseCase } from '../../src/modules/rfq/application/use-cases/rfq.use-cases';
import { IRFQRepository } from '../../src/modules/rfq/domain/repositories/rfq.repository.interface';
import { RFQEntity } from '../../src/modules/rfq/domain/entities/rfq.entity';
import { DomainError } from '../../src/shared/errors/AppError';

describe('CreateRfqUseCase Unit Tests', () => {
  const mockRepo: IRFQRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  };

  const useCase = new CreateRfqUseCase(mockRepo);

  it('should throw DomainError when neededBy date is in the past', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    await expect(
      useCase.execute({
        partNumber: 'brg-100',
        description: 'Test Bearing',
        quantity: 10,
        neededBy: pastDate.toISOString(),
      })
    ).rejects.toThrow(DomainError);
  });

  it('should call repository create with uppercase partNumber and future neededBy', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    const createdEntity = new RFQEntity({
      id: 'mock-uuid',
      partNumber: 'BRG-100',
      description: 'Test Bearing',
      quantity: 10,
      neededBy: futureDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      quotes: [],
    });

    vi.mocked(mockRepo.create).mockResolvedValueOnce(createdEntity);

    const result = await useCase.execute({
      partNumber: 'brg-100',
      description: 'Test Bearing',
      quantity: 10,
      neededBy: futureDate.toISOString(),
    });

    expect(result.partNumber).toBe('BRG-100');
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        partNumber: 'BRG-100',
        quantity: 10,
      })
    );
  });
});
