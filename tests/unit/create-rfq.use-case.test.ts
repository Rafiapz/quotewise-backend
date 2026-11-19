import { describe, it, expect, vi } from 'vitest';
import { RFQUseCases } from '../../src/modules/rfq/application/use-cases/rfq.use-cases';
import { IRFQRepository } from '../../src/modules/rfq/domain/repositories/rfq.repository.interface';
import { RFQEntity } from '../../src/modules/rfq/domain/entities/rfq.entity';
import { DomainError, NotFoundError } from '../../src/shared/errors/AppError';

describe('RFQUseCases Application Service Unit Tests', () => {
  const mockRepo: IRFQRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  };

  const useCases = new RFQUseCases(mockRepo);

  it('createRfq should throw DomainError when neededBy date is in the past', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    await expect(
      useCases.createRfq({
        partNumber: 'brg-100',
        description: 'Test Bearing',
        quantity: 10,
        neededBy: pastDate.toISOString(),
      })
    ).rejects.toThrow(DomainError);
  });

  it('createRfq should call repository create with uppercase partNumber and future neededBy', async () => {
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

    const result = await useCases.createRfq({
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

  it('getRfqById should throw NotFoundError when RFQ does not exist', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValueOnce(null);

    await expect(useCases.getRfqById('non-existent-id')).rejects.toThrow(NotFoundError);
  });

  it('getRfqList should return all RFQs from repository', async () => {
    vi.mocked(mockRepo.findAll).mockResolvedValueOnce([]);

    const result = await useCases.getRfqList();
    expect(result).toEqual([]);
    expect(mockRepo.findAll).toHaveBeenCalled();
  });
});
