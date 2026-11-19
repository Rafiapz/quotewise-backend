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
    this.id = props.id;
    this.rfqId = props.rfqId;
    this.supplierName = props.supplierName;
    this.unitPrice = props.unitPrice;
    this.leadTime = props.leadTime;
    this.validUntil = props.validUntil;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
