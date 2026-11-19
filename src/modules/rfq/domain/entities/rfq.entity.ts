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
   * Calculates the RFQ status dynamically based on deadline and quotations count.
   */
  public get status(): RfqStatus {
    const now = new Date();
    if (this.neededBy.getTime() < now.getTime()) {
      return 'EXPIRED';
    }
    if (this.quotes.length > 0) {
      return 'QUOTED';
    }
    return 'OPEN';
  }

  /**
   * Calculates the best quotation dynamically (lowest unit price).
   */
  public get bestQuote(): SupplierQuoteEntity | null {
    if (this.quotes.length === 0) {
      return null;
    }

    return this.quotes.reduce<SupplierQuoteEntity>((best, current) => {
      return current.unitPrice < best.unitPrice ? current : best;
    }, this.quotes[0]);
  }

  /**
   * Dynamic total quotation count.
   */
  public get quoteCount(): number {
    return this.quotes.length;
  }
}
