import { describe, it, expect, vi } from 'vitest';
import { CreateQuotationUseCase } from '../../src/modules/quotation/application/use-cases/create-quotation.use-case';
import { IQuotationRepository } from '../../src/modules/quotation/domain/repositories/quotation.repository.interface';
import { IRFQRepository } from '../../src/modules/rfq/domain/repositories/rfq.repository.interface';
import { RFQEntity } from '../../src/modules/rfq/domain/entities/rfq.entity';
import { SupplierQuoteEntity } from '../../src/modules/quotation/domain/entities/quotation.entity';
import { NotFoundError, DomainError } from '../../src/shared/errors/AppError';

describe('CreateQuotationUseCase Unit Tests', () => {
  const mockQuoteRepo: IQuotationRepository = {
    findById: vi.fn(),
    findByRfqId: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  };

  const mockRfqRepo: IRFQRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  };

  const useCase = new CreateQuotationUseCase(mockQuoteRepo, mockRfqRepo);

  it('should throw NotFoundError if RFQ does not exist', async () => {
    vi.mocked(mockRfqRepo.findById).mockResolvedValueOnce(null);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    await expect(
      useCase.execute({
        rfqId: 'non-existent-rfq',
        supplierName: 'Acme Fasteners',
        unitPrice: 15.0,
        leadTime: 7,
        validUntil: futureDate.toISOString(),
      })
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw DomainError if RFQ deadline has expired', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    const expiredRfq = new RFQEntity({
      id: 'expired-rfq',
      partNumber: 'OLD-PART',
      description: 'Expired RFQ',
      quantity: 100,
      neededBy: pastDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      quotes: [],
    });

    vi.mocked(mockRfqRepo.findById).mockResolvedValueOnce(expiredRfq);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    await expect(
      useCase.execute({
        rfqId: 'expired-rfq',
        supplierName: 'Acme Fasteners',
        unitPrice: 15.0,
        leadTime: 7,
        validUntil: futureDate.toISOString(),
      })
    ).rejects.toThrow(DomainError);
  });

  it('should create quotation when RFQ is active and validity date is in future', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    const activeRfq = new RFQEntity({
      id: 'active-rfq',
      partNumber: 'ACTIVE-PART',
      description: 'Active RFQ',
      quantity: 100,
      neededBy: futureDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      quotes: [],
    });

    const createdQuote = new SupplierQuoteEntity({
      id: 'quote-100',
      rfqId: 'active-rfq',
      supplierName: 'Fast Supplier',
      unitPrice: 22.5,
      leadTime: 5,
      validUntil: futureDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(mockRfqRepo.findById).mockResolvedValueOnce(activeRfq);
    vi.mocked(mockQuoteRepo.create).mockResolvedValueOnce(createdQuote);

    const result = await useCase.execute({
      rfqId: 'active-rfq',
      supplierName: 'Fast Supplier',
      unitPrice: 22.5,
      leadTime: 5,
      validUntil: futureDate.toISOString(),
    });

    expect(result.supplierName).toBe('Fast Supplier');
    expect(result.unitPrice).toBe(22.5);
  });
});
