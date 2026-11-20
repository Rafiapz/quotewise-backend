/// <reference path="../../src/shared/types/express.d.ts" />
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { RFQController } from "../../src/modules/rfq/presentation/controllers/rfq.controller";
import { QuotationController } from "../../src/modules/quotation/presentation/controllers/quotation.controller";
import { RFQUseCases } from "../../src/modules/rfq/application/use-cases/rfq.use-cases";
import { QuotationUseCases } from "../../src/modules/quotation/application/use-cases/quotation.use-cases";
import { RFQEntity } from "../../src/modules/rfq/domain/entities/rfq.entity";
import { SupplierQuoteEntity } from "../../src/modules/quotation/domain/entities/quotation.entity";
import { UnauthorizedError, ForbiddenError } from "../../src/shared/errors/AppError";
import { TokenPayload } from "../../src/modules/auth/domain/services/token-service.interface";

interface MockRequest extends Partial<Request> {
  user?: TokenPayload;
  params?: Record<string, string>;
  query?: Record<string, any>;
  body?: any;
}

describe("Clean Architecture Multi-Tenant User Isolation & Authorization Tests", () => {
  const userA: TokenPayload = {
    userId: "11111111-1111-1111-1111-111111111111",
    email: "userA@example.com",
    companyName: "Company A",
  };

  const userB: TokenPayload = {
    userId: "22222222-2222-2222-2222-222222222222",
    email: "userB@example.com",
    companyName: "Company B",
  };

  const mockRfqUserA = new RFQEntity({
    id: "rfq-user-a-1",
    partNumber: "PART-A-100",
    description: "Component A",
    quantity: 100,
    neededBy: new Date(Date.now() + 10 * 86400000),
    userId: userA.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    quotes: [],
  });

  const mockQuoteUserA = new SupplierQuoteEntity({
    id: "quote-user-a-1",
    rfqId: "rfq-user-a-1",
    name: "Supplier Alpha",
    unitPrice: 25.5,
    leadTime: new Date(Date.now() + 5 * 86400000),
    validUntil: new Date(Date.now() + 15 * 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe("Application Layer (Use Cases) Direct Business Authorization", () => {
    let mockRfqRepo: any;
    let mockQuoteRepo: any;
    let rfqUseCases: RFQUseCases;
    let quotationUseCases: QuotationUseCases;

    beforeEach(() => {
      mockRfqRepo = {
        create: vi.fn(),
        findById: vi.fn().mockImplementation((id: string) => {
          if (id === mockRfqUserA.id) return Promise.resolve(mockRfqUserA);
          return Promise.resolve(null);
        }),
        findAll: vi.fn().mockResolvedValue({
          items: [mockRfqUserA],
          meta: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
          stats: { total: 1, open: 1, quoted: 0, expired: 0 },
        }),
        update: vi.fn().mockImplementation((id: string, data: any) =>
          Promise.resolve(new RFQEntity({ ...mockRfqUserA, ...data })),
        ),
        delete: vi.fn().mockResolvedValue(true),
      };

      mockQuoteRepo = {
        create: vi.fn().mockResolvedValue(mockQuoteUserA),
        findById: vi.fn().mockImplementation((id: string) => {
          if (id === mockQuoteUserA.id) return Promise.resolve(mockQuoteUserA);
          return Promise.resolve(null);
        }),
        findByRfqId: vi.fn().mockResolvedValue({
          items: [mockQuoteUserA],
          meta: { page: 1, limit: 6, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
          lowestUnitPrice: 25.5,
        }),
        findAll: vi.fn().mockResolvedValue([mockQuoteUserA]),
        delete: vi.fn().mockResolvedValue(true),
        deleteByRfqId: vi.fn().mockResolvedValue(1),
      };

      rfqUseCases = new RFQUseCases({
        RFQRepository: mockRfqRepo,
        QuotationRepository: mockQuoteRepo,
      });

      quotationUseCases = new QuotationUseCases({
        QuotationRepository: mockQuoteRepo,
        RFQRepository: mockRfqRepo,
      });
    });

    it("RFQUseCases: getRfqById should throw ForbiddenError if requesting user does not own RFQ", async () => {
      await expect(
        rfqUseCases.getRfqById(mockRfqUserA.id, userB.userId),
      ).rejects.toThrow(ForbiddenError);
    });

    it("RFQUseCases: getRfqById should succeed for the RFQ owner", async () => {
      const result = await rfqUseCases.getRfqById(mockRfqUserA.id, userA.userId);
      expect(result.id).toBe(mockRfqUserA.id);
    });

    it("RFQUseCases: updateRfq should throw ForbiddenError if requesting user does not own RFQ", async () => {
      await expect(
        rfqUseCases.updateRfq(mockRfqUserA.id, { description: "Hacked" }, userB.userId),
      ).rejects.toThrow(ForbiddenError);
      expect(mockRfqRepo.update).not.toHaveBeenCalled();
    });

    it("RFQUseCases: updateRfq should execute update if owner matches in a single lookup", async () => {
      const updated = await rfqUseCases.updateRfq(
        mockRfqUserA.id,
        { description: "Valid Update" },
        userA.userId,
      );
      expect(mockRfqRepo.update).toHaveBeenCalled();
      expect(updated.description).toBe("Valid Update");
    });

    it("RFQUseCases: deleteRfq should throw ForbiddenError if requesting user does not own RFQ", async () => {
      await expect(
        rfqUseCases.deleteRfq(mockRfqUserA.id, userB.userId),
      ).rejects.toThrow(ForbiddenError);
      expect(mockRfqRepo.delete).not.toHaveBeenCalled();
    });

    it("QuotationUseCases: getQuotationsByRfq should throw ForbiddenError if parent RFQ belongs to another user", async () => {
      await expect(
        quotationUseCases.getQuotationsByRfq(mockRfqUserA.id, undefined, userB.userId),
      ).rejects.toThrow(ForbiddenError);
      expect(mockQuoteRepo.findByRfqId).not.toHaveBeenCalled();
    });

    it("QuotationUseCases: createQuotation should throw ForbiddenError if adding to another user's RFQ", async () => {
      await expect(
        quotationUseCases.createQuotation(
          {
            name: "Hacker Quote",
            rfqId: mockRfqUserA.id,
            unitPrice: 10,
            leadTime: 3,
            validUntil: new Date().toISOString(),
          },
          userB.userId,
        ),
      ).rejects.toThrow(ForbiddenError);
      expect(mockQuoteRepo.create).not.toHaveBeenCalled();
    });

    it("QuotationUseCases: deleteQuotation should throw ForbiddenError if deleting a quote for another user's RFQ", async () => {
      await expect(
        quotationUseCases.deleteQuotation(mockQuoteUserA.id, userB.userId),
      ).rejects.toThrow(ForbiddenError);
      expect(mockQuoteRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe("Presentation Layer (Controllers) Thin Dispatch & Parameter Forwarding", () => {
    let mockRfqUseCases: any;
    let mockQuotationUseCases: any;
    let rfqController: RFQController;
    let quotationController: QuotationController;

    let mockResponse: Partial<Response>;
    let jsonMock: any;
    let statusMock: any;
    let nextMock: any;

    beforeEach(() => {
      jsonMock = vi.fn();
      statusMock = vi.fn().mockReturnValue({ json: jsonMock });
      nextMock = vi.fn();

      mockResponse = {
        status: statusMock,
        json: jsonMock,
      };

      mockRfqUseCases = {
        getRfqList: vi.fn().mockResolvedValue({
          items: [mockRfqUserA],
          meta: { page: 1, limit: 9, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
          stats: { total: 1, open: 1, quoted: 0, expired: 0 },
        }),
        getRfqById: vi.fn().mockImplementation((id: string, userId?: string) => {
          if (id === mockRfqUserA.id && userId === userA.userId) return Promise.resolve(mockRfqUserA);
          if (id === mockRfqUserA.id && userId === userB.userId) return Promise.reject(new ForbiddenError());
          return Promise.reject(new Error("RFQ not found"));
        }),
        createRfq: vi.fn().mockImplementation((dto: any) =>
          Promise.resolve(
            new RFQEntity({
              id: "new-rfq-id",
              partNumber: dto.partNumber,
              description: dto.description,
              quantity: dto.quantity,
              neededBy: new Date(dto.neededBy),
              userId: dto.userId,
              createdAt: new Date(),
              updatedAt: new Date(),
              quotes: [],
            }),
          ),
        ),
        updateRfq: vi.fn().mockImplementation((id: string, dto: any, userId?: string) => {
          if (userId === userB.userId) return Promise.reject(new ForbiddenError());
          return Promise.resolve(new RFQEntity({ ...mockRfqUserA, ...dto }));
        }),
        deleteRfq: vi.fn().mockImplementation((id: string, userId?: string) => {
          if (userId === userB.userId) return Promise.reject(new ForbiddenError());
          return Promise.resolve(true);
        }),
      };

      mockQuotationUseCases = {
        getQuotationsByRfq: vi.fn().mockImplementation((rfqId: string, _opts: any, userId?: string) => {
          if (userId === userB.userId) return Promise.reject(new ForbiddenError());
          return Promise.resolve({
            items: [mockQuoteUserA],
            meta: { page: 1, limit: 6, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
            lowestUnitPrice: 25.5,
          });
        }),
        createQuotation: vi.fn().mockImplementation((_dto: any, userId?: string) => {
          if (userId === userB.userId) return Promise.reject(new ForbiddenError());
          return Promise.resolve(mockQuoteUserA);
        }),
        deleteQuotation: vi.fn().mockImplementation((_id: string, userId?: string) => {
          if (userId === userB.userId) return Promise.reject(new ForbiddenError());
          return Promise.resolve(true);
        }),
        getAllQuotations: vi.fn().mockResolvedValue([mockQuoteUserA]),
      };

      rfqController = new RFQController({
        RFQUseCases: mockRfqUseCases as unknown as RFQUseCases,
      });

      quotationController = new QuotationController({
        QuotationUseCases: mockQuotationUseCases as unknown as QuotationUseCases,
      });
    });

    it("RFQController.getAll: should strictly forward userId from authenticated token", async () => {
      const req: MockRequest = {
        query: { page: "1", limit: "9", status: "ALL" },
        user: userA,
      };

      await rfqController.getAll(req as Request, mockResponse as Response, nextMock);

      expect(mockRfqUseCases.getRfqList).toHaveBeenCalledWith({
        page: 1,
        limit: 9,
        search: undefined,
        status: "ALL",
        userId: userA.userId,
      });
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it("RFQController.getAll: should reject unauthenticated request", async () => {
      const req: MockRequest = {
        query: { page: "1" },
        user: undefined,
      };

      await rfqController.getAll(req as Request, mockResponse as Response, nextMock);

      expect(nextMock).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("RFQController.getById: should pass userId to use-case and reject unauthorized access", async () => {
      const req: MockRequest = {
        params: { id: mockRfqUserA.id },
        user: userB,
      };

      await rfqController.getById(req as Request, mockResponse as Response, nextMock);

      expect(mockRfqUseCases.getRfqById).toHaveBeenCalledWith(mockRfqUserA.id, userB.userId);
      expect(nextMock).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it("RFQController.create: should force authenticated userId and ignore spoofed body", async () => {
      const req: MockRequest = {
        body: {
          partNumber: "PART-123",
          description: "Widget",
          quantity: 50,
          neededBy: new Date().toISOString(),
          userId: userB.userId,
        },
        user: userA,
      };

      await rfqController.create(req as Request, mockResponse as Response, nextMock);

      expect(mockRfqUseCases.createRfq).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: userA.userId,
        }),
      );
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it("RFQController.update: should forward userId to use-case and reject unauthorized updates", async () => {
      const req: MockRequest = {
        params: { id: mockRfqUserA.id },
        body: { description: "Malicious update" },
        user: userB,
      };

      await rfqController.update(req as Request, mockResponse as Response, nextMock);

      expect(mockRfqUseCases.updateRfq).toHaveBeenCalledWith(
        mockRfqUserA.id,
        expect.any(Object),
        userB.userId,
      );
      expect(nextMock).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it("RFQController.delete: should forward userId to use-case and reject unauthorized deletes", async () => {
      const req: MockRequest = {
        params: { id: mockRfqUserA.id },
        user: userB,
      };

      await rfqController.delete(req as Request, mockResponse as Response, nextMock);

      expect(mockRfqUseCases.deleteRfq).toHaveBeenCalledWith(mockRfqUserA.id, userB.userId);
      expect(nextMock).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it("QuotationController.getByRfq: should forward userId to use-case and reject unauthorized views", async () => {
      const req: MockRequest = {
        params: { rfqId: mockRfqUserA.id },
        query: {},
        user: userB,
      };

      await quotationController.getByRfq(req as Request, mockResponse as Response, nextMock);

      expect(mockQuotationUseCases.getQuotationsByRfq).toHaveBeenCalledWith(
        mockRfqUserA.id,
        expect.any(Object),
        userB.userId,
      );
      expect(nextMock).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it("QuotationController.create: should forward userId to use-case and reject unauthorized submissions", async () => {
      const req: MockRequest = {
        body: {
          rfqId: mockRfqUserA.id,
          name: "Supplier Malicious",
          unitPrice: 10,
          leadTime: 3,
          validUntil: new Date().toISOString(),
        },
        user: userB,
      };

      await quotationController.create(req as Request, mockResponse as Response, nextMock);

      expect(mockQuotationUseCases.createQuotation).toHaveBeenCalledWith(
        expect.objectContaining({ rfqId: mockRfqUserA.id }),
        userB.userId,
      );
      expect(nextMock).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it("QuotationController.delete: should forward userId to use-case and reject unauthorized deletion", async () => {
      const req: MockRequest = {
        params: { id: mockQuoteUserA.id },
        user: userB,
      };

      await quotationController.delete(req as Request, mockResponse as Response, nextMock);

      expect(mockQuotationUseCases.deleteQuotation).toHaveBeenCalledWith(
        mockQuoteUserA.id,
        userB.userId,
      );
      expect(nextMock).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });
});
