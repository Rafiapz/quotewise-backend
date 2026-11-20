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
  readonly id: string;
  readonly name: string;
  readonly rfqId: string;
  readonly unitPrice: number;
  readonly leadTime: Date;
  readonly validUntil: Date;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

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

  static fromJSON(raw: any): SupplierQuoteEntity {
    return new SupplierQuoteEntity({
      id: raw.id,
      name: raw.name || raw.supplierName || '',
      rfqId: raw.rfqId,
      unitPrice: Number(raw.unitPrice),
      leadTime: raw.leadTime instanceof Date ? raw.leadTime : new Date(String(raw.leadTime)),
      validUntil: raw.validUntil instanceof Date ? raw.validUntil : new Date(String(raw.validUntil)),
      isActive: raw.isActive !== undefined ? raw.isActive : true,
      createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(String(raw.createdAt)),
      updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt : new Date(String(raw.updatedAt)),
    });
  }
}
