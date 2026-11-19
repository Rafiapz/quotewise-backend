import { describe, it, expect } from 'vitest';
import { RFQEntity } from '../../src/modules/rfq/domain/entities/rfq.entity';
import { SupplierQuoteEntity } from '../../src/modules/quotation/domain/entities/quotation.entity';

describe('RFQEntity Domain Unit Tests', () => {
  it('should calculate OPEN status when neededBy is in the future and there are no quotes', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    const rfq = new RFQEntity({
      id: '123e4567-e89b-12d3-a456-426614174000',
      partNumber: 'BRG-1029',
      description: 'Steel Ball Bearings',
      quantity: 500,
      neededBy: futureDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      quotes: [],
    });

    expect(rfq.status).toBe('OPEN');
    expect(rfq.quoteCount).toBe(0);
    expect(rfq.bestQuote).toBeNull();
  });

  it('should calculate QUOTED status when neededBy is in the future and quotes exist', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    const quote1 = new SupplierQuoteEntity({
      id: 'quote-1',
      rfqId: 'rfq-1',
      supplierName: 'Alpha Supply Co.',
      unitPrice: 12.5,
      leadTime: 14,
      validUntil: futureDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const quote2 = new SupplierQuoteEntity({
      id: 'quote-2',
      rfqId: 'rfq-1',
      supplierName: 'Beta Industrial',
      unitPrice: 9.75,
      leadTime: 20,
      validUntil: futureDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const rfq = new RFQEntity({
      id: 'rfq-1',
      partNumber: 'BRG-1029',
      description: 'Steel Ball Bearings',
      quantity: 500,
      neededBy: futureDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      quotes: [quote1, quote2],
    });

    expect(rfq.status).toBe('QUOTED');
    expect(rfq.quoteCount).toBe(2);
    expect(rfq.bestQuote?.id).toBe('quote-2');
    expect(rfq.bestQuote?.unitPrice).toBe(9.75);
  });

  it('should calculate EXPIRED status dynamically when deadline is past', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);

    const rfq = new RFQEntity({
      id: 'rfq-expired',
      partNumber: 'BRG-1029',
      description: 'Steel Ball Bearings',
      quantity: 500,
      neededBy: pastDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      quotes: [],
    });

    expect(rfq.status).toBe('EXPIRED');
  });
});
