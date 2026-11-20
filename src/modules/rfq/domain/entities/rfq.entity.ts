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
   * - EXPIRED if deadline has passed
   * - QUOTED if quotations have been received
   * - OPEN if pending quotations
   */
  get status(): RfqStatus {
    const now = new Date();
    if (this.neededBy.getTime() < now.getTime()) {
      return "EXPIRED";
    }
    if (this.quotes.length > 0) {
      return "QUOTED";
    }
    return "OPEN";
  }

  /**
   * Calculates best quotation dynamically (lowest unit price).
   */
  get bestQuote(): SupplierQuoteEntity | null {
    if (this.quotes.length === 0) {
      return null;
    }

    return this.quotes.reduce<SupplierQuoteEntity>((best, current) => {
      return current.unitPrice < best.unitPrice ? current : best;
    }, this.quotes[0]);
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
      neededBy: raw.neededBy instanceof Date ? raw.neededBy : new Date(raw.neededBy),
      userId: raw.userId,
      isActive: raw.isActive !== undefined ? raw.isActive : true,
      createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(raw.createdAt),
      updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt : new Date(raw.updatedAt),
      quotes,
    });
  }
}
