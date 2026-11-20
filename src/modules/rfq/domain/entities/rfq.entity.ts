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
   * If unit prices are tied, the quote with the earlier delivery is selected.
   */
  getBestQuoteAsOf(asOf: Date = new Date()): SupplierQuoteEntity | null {
    // 1. Filter: quotes that are valid and arrive on time
    const eligibleQuotes = this.quotes.filter(
      (q) =>
        new Date(q.validUntil).getTime() >= asOf.getTime() &&
        new Date(q.leadTime).getTime() <= this.neededBy.getTime(),
    );

    if (eligibleQuotes.length === 0) return null;

    // 2. Sort: lowest price first; on price tie, earliest delivery first
    eligibleQuotes.sort((a, b) => {
      if (a.unitPrice !== b.unitPrice) {
        return a.unitPrice - b.unitPrice;
      }
      return new Date(a.leadTime).getTime() - new Date(b.leadTime).getTime();
    });

    // 3. The best quote is the first one
    return eligibleQuotes[0];
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
