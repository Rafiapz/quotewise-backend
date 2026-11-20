import {
  IRFQRepository,
  RfqFilterOptions,
  PaginatedRfqResult,
  UpdateRFQData,
} from "../../domain/repositories/rfq.repository.interface";
import { IQuotationRepository } from "../../../quotation/domain/repositories/quotation.repository.interface";
import { CreateRfqDTO, UpdateRfqDTO } from "../dto/rfq.dto";
import { RFQEntity } from "../../domain/entities/rfq.entity";
import { NotFoundError } from "../../../../shared/errors/AppError";

export interface RFQUseCasesConstructorParams {
  RFQRepository: IRFQRepository;
  QuotationRepository?: IQuotationRepository;
}

export class RFQUseCases {
  private rfqRepository: IRFQRepository;
  private quotationRepository?: IQuotationRepository;

  constructor({
    RFQRepository,
    QuotationRepository,
  }: RFQUseCasesConstructorParams) {
    this.rfqRepository = RFQRepository;
    this.quotationRepository = QuotationRepository;
  }

  async createRfq(dto: CreateRfqDTO): Promise<RFQEntity> {
    return this.rfqRepository.create({
      partNumber: dto.partNumber,
      description: dto.description,
      quantity: dto.quantity,
      neededBy: new Date(dto.neededBy),
      userId: dto.userId,
    });
  }

  async updateRfq(id: string, dto: UpdateRfqDTO): Promise<RFQEntity> {
    const rfq = await this.rfqRepository.findById(id);
    if (!rfq) {
      throw new NotFoundError(`RFQ with ID ${id} not found`);
    }

    const updatePayload: UpdateRFQData = {};

    if (dto.partNumber !== undefined) {
      updatePayload.partNumber = dto.partNumber;
    }
    if (dto.description !== undefined) {
      updatePayload.description = dto.description;
    }
    if (dto.quantity !== undefined) {
      updatePayload.quantity = dto.quantity;
    }
    if (dto.neededBy !== undefined) {
      updatePayload.neededBy = new Date(dto.neededBy);
    }

    const updated = await this.rfqRepository.update(id, updatePayload);

    if (!updated) {
      throw new NotFoundError(`RFQ with ID ${id} could not be updated`);
    }

    return updated;
  }

  async getRfqList(options?: RfqFilterOptions): Promise<PaginatedRfqResult> {
    return this.rfqRepository.findAll(options);
  }

  async getRfqById(id: string): Promise<RFQEntity> {
    const rfq = await this.rfqRepository.findById(id);
    if (!rfq) {
      throw new NotFoundError(`RFQ with ID ${id} not found`);
    }
    return rfq;
  }

  async deleteRfq(id: string): Promise<boolean> {
    const rfq = await this.rfqRepository.findById(id);
    if (!rfq) {
      throw new NotFoundError(`RFQ with ID ${id} not found or already deleted`);
    }

    if (this.quotationRepository) {
      await this.quotationRepository.deleteByRfqId(id);
    }

    const deleted = await this.rfqRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError(`RFQ with ID ${id} could not be deleted`);
    }

    return true;
  }
}
