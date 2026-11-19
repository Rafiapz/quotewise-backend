export interface SupplierQuoteProps {
  id: string;
  name: string;
  rfqId: string;
  unitPrice: number;
  leadTime: Date;
  validUntil: Date;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class SupplierQuoteEntity {
  public readonly id: string;
  public readonly name: string;
  public readonly rfqId: string;
  public readonly unitPrice: number;
  public readonly leadTime: Date;
  public readonly validUntil: Date;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: SupplierQuoteProps) {
    this.id = props.id;
    this.name = props.name;
    this.rfqId = props.rfqId;
    this.unitPrice = props.unitPrice;
    this.leadTime = props.leadTime;
    this.validUntil = props.validUntil;
    this.isActive = props.isActive !== undefined ? props.isActive : true;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
