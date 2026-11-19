import { SupplierQuoteEntity } from '../../../quotation/domain/entities/quotation.entity';

export type RfqStatus = 'OPEN' | 'QUOTED' | 'EXPIRED';

export interface RFQProps {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  neededBy: Date;
  createdAt: Date;
  updatedAt: Date;
  quotes?: SupplierQuoteEntity[];
}

export class RFQEntity {
  public readonly id: string;
  public readonly partNumber: string;
  public readonly description: string;
  public readonly quantity: number;
  public readonly neededBy: Date;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly quotes: SupplierQuoteEntity[];

  constructor(props: RFQProps) {
    if (props.quantity <= 0) {
      throw new Error('Quantity must be a positive integer greater than zero.');
    }

    this.id = props.id;
    this.partNumber = props.partNumber;
    this.description = props.description;
    this.quantity = props.quantity;
    this.neededBy = props.neededBy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.quotes = props.quotes || [];
  }

  /**
   * Determines if the RFQ deadline has passed relative to a reference date.
   */
  public isExpired(referenceDate: Date = new Date()): boolean {
    return this.neededBy.getTime() < referenceDate.getTime();
  }

  /**
   * Calculates the RFQ status dynamically based on deadline and quotations count.
   */
  public get status(): RfqStatus {
    if (this.isExpired()) {
      return 'EXPIRED';
    }
    if (this.quotes.length > 0) {
      return 'QUOTED';
    }
    return 'OPEN';
  }

  /**
   * Determines if new supplier quotations can still be accepted.
   */
  public canAcceptQuotes(referenceDate: Date = new Date()): boolean {
    return !this.isExpired(referenceDate);
  }

  /**
   * Calculates the best quotation dynamically (lowest unit price among active, non-expired quotes).
   * If all quotes are expired, falls back to the lowest quote overall.
   */
  public get bestQuote(): SupplierQuoteEntity | null {
    if (this.quotes.length === 0) {
      return null;
    }

    const now = new Date();
    const activeQuotes = this.quotes.filter((q) => !q.isExpired(now));

    const candidatePool = activeQuotes.length > 0 ? activeQuotes : this.quotes;

    return candidatePool.reduce<SupplierQuoteEntity>((best, current) => {
      return current.unitPrice < best.unitPrice ? current : best;
    }, candidatePool[0]);
  }

  /**
   * Dynamic total quotation count.
   */
  public get quoteCount(): number {
    return this.quotes.length;
  }
}
