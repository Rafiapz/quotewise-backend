import { SupplierQuoteEntity } from "../../../quotation/domain/entities/quotation.entity";

export type RfqStatus = "OPEN" | "QUOTED" | "EXPIRED";

export interface RFQProps {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  neededBy: Date;
  userId: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
  quotes?: SupplierQuoteEntity[];
}

export class RFQEntity {
  readonly id: string;
  readonly partNumber: string;
  readonly description: string;
  readonly quantity: number;
  readonly neededBy: Date;
  readonly userId: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly quotes: SupplierQuoteEntity[];

  constructor(props: RFQProps) {
    this.id = props.id;
    this.partNumber = props.partNumber;
    this.description = props.description;
    this.quantity = props.quantity;
    this.neededBy = props.neededBy;
    this.userId = props.userId;
    this.isActive = props.isActive !== undefined ? props.isActive : true;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.quotes = props.quotes || [];
  }

  /**
   * Calculates RFQ status dynamically:
   * - Open — no quotes yet.
   * - Quoted — at least one quote that is still valid.
   * - Expired — the "needed by" date has passed, or every quote is past its "valid until" date.
   */
  getStatusAsOf(asOf: Date = new Date()): RfqStatus {
    if (this.neededBy.getTime() < asOf.getTime()) {
      return "EXPIRED";
    }
    if (this.quotes.length === 0) {
      return "OPEN";
    }
    const hasValidQuote = this.quotes.some(
      (q) => new Date(q.validUntil).getTime() >= asOf.getTime(),
    );
    return hasValidQuote ? "QUOTED" : "EXPIRED";
  }

  get status(): RfqStatus {
    return this.getStatusAsOf(new Date());
  }

  /**
   * Finds the BEST quote:
   * The cheapest quote that is still valid AND can arrive in time for "needed by".
   * A cheaper quote that would arrive late is not the best quote.
   * If unit prices are tied, the quote with the earlier delivery is selected.
   */
  getBestQuoteAsOf(asOf: Date = new Date()): SupplierQuoteEntity | null {
    const asOfTime = asOf.getTime();
    const neededByTime = this.neededBy.getTime();

    // 1. Filter: quotes that are still valid AND arrive in time
    const eligibleQuotes = this.quotes.filter((q) => {
      const isValid = new Date(q.validUntil).getTime() >= asOfTime;
      const arrivesInTime = new Date(q.leadTime).getTime() <= neededByTime;
      return isValid && arrivesInTime;
    });

    if (eligibleQuotes.length === 0) return null;

    // 2. Select cheapest; if tied on price, pick earliest delivery
    return eligibleQuotes.reduce((best, current) => {
      if (current.unitPrice < best.unitPrice) return current;
      if (current.unitPrice === best.unitPrice) {
        return (
          new Date(current.leadTime).getTime() <
          new Date(best.leadTime).getTime()
            ? current
            : best
        );
      }
      return best;
    });
  }

  get bestQuote(): SupplierQuoteEntity | null {
    return this.getBestQuoteAsOf(new Date());
  }

  get quoteCount(): number {
    return this.quotes.length;
  }

  static fromJSON(raw: any): RFQEntity {
    const quotes = (raw.quotes || []).map((q: any) =>
      SupplierQuoteEntity.fromJSON(q),
    );

    return new RFQEntity({
      id: raw.id,
      partNumber: raw.partNumber,
      description: raw.description,
      quantity: raw.quantity,
      neededBy:
        raw.neededBy instanceof Date ? raw.neededBy : new Date(raw.neededBy),
      userId: raw.userId,
      isActive: raw.isActive !== undefined ? raw.isActive : true,
      createdAt:
        raw.createdAt instanceof Date ? raw.createdAt : new Date(raw.createdAt),
      updatedAt:
        raw.updatedAt instanceof Date ? raw.updatedAt : new Date(raw.updatedAt),
      quotes,
    });
  }
}
