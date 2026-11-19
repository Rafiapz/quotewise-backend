export interface SupplierQuoteProps {
  id: string;
  rfqId: string;
  supplierName: string;
  unitPrice: number;
  leadTime: number;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class SupplierQuoteEntity {
  public readonly id: string;
  public readonly rfqId: string;
  public readonly supplierName: string;
  public readonly unitPrice: number;
  public readonly leadTime: number;
  public readonly validUntil: Date;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: SupplierQuoteProps) {
    if (props.unitPrice <= 0) {
      throw new Error('Unit price must be a positive number.');
    }
    if (props.leadTime <= 0) {
      throw new Error('Lead time must be at least 1 day.');
    }

    this.id = props.id;
    this.rfqId = props.rfqId;
    this.supplierName = props.supplierName.trim();
    this.unitPrice = props.unitPrice;
    this.leadTime = props.leadTime;
    this.validUntil = props.validUntil;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Checks whether the quotation validity period has elapsed.
   */
  public isExpired(referenceDate: Date = new Date()): boolean {
    return this.validUntil.getTime() < referenceDate.getTime();
  }

  /**
   * Total calculated cost for a given RFQ quantity.
   */
  public calculateTotalCost(quantity: number): number {
    if (quantity <= 0) return 0;
    return Number((this.unitPrice * quantity).toFixed(2));
  }
}
