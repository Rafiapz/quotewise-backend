import { describe, it, expect, vi } from "vitest";
import { createRfqSchema } from "../../src/modules/rfq/presentation/validators/rfq.validator";
import { createQuotationSchema } from "../../src/modules/quotation/presentation/validators/quotation.validator";
import { RFQUseCases } from "../../src/modules/rfq/application/use-cases/rfq.use-cases";
import { QuotationUseCases } from "../../src/modules/quotation/application/use-cases/quotation.use-cases";
import { ValidationError } from "../../src/shared/errors/AppError";

describe("Past Date Validation Tests", () => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  describe("Presentation Layer Zod Schemas", () => {
    it("createRfqSchema should reject a past neededBy date", () => {
      const result = createRfqSchema.safeParse({
        partNumber: "PART-123",
        description: "Test description",
        quantity: 10,
        neededBy: yesterday,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find((e) => e.path.includes("neededBy"));
        expect(error?.message).toBe("Needed by date cannot be in the past");
      }
    });

    it("createRfqSchema should accept today or future neededBy date", () => {
      const resultToday = createRfqSchema.safeParse({
        partNumber: "PART-123",
        description: "Test description",
        quantity: 10,
        neededBy: today,
      });
      expect(resultToday.success).toBe(true);

      const resultTomorrow = createRfqSchema.safeParse({
        partNumber: "PART-123",
        description: "Test description",
        quantity: 10,
        neededBy: tomorrow,
      });
      expect(resultTomorrow.success).toBe(true);
    });

    it("createQuotationSchema should reject a past validUntil date", () => {
      const result = createQuotationSchema.safeParse({
        name: "Supplier Acme",
        rfqId: "11111111-1111-1111-1111-111111111111",
        unitPrice: 50,
        leadTime: 5,
        validUntil: yesterday,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find((e) => e.path.includes("validUntil"));
        expect(error?.message).toBe("Valid until date cannot be in the past");
      }
    });

    it("createQuotationSchema should accept today or future validUntil date", () => {
      const resultToday = createQuotationSchema.safeParse({
        name: "Supplier Acme",
        rfqId: "11111111-1111-1111-1111-111111111111",
        unitPrice: 50,
        leadTime: 5,
        validUntil: today,
      });
      expect(resultToday.success).toBe(true);

      const resultTomorrow = createQuotationSchema.safeParse({
        name: "Supplier Acme",
        rfqId: "11111111-1111-1111-1111-111111111111",
        unitPrice: 50,
        leadTime: 5,
        validUntil: tomorrow,
      });
      expect(resultTomorrow.success).toBe(true);
    });
  });

  describe("Application Layer (Use Cases) Validation", () => {
    it("RFQUseCases.createRfq should throw ValidationError when neededBy is in the past", async () => {
      const mockRfqRepo: any = { create: vi.fn() };
      const rfqUseCases = new RFQUseCases({ RFQRepository: mockRfqRepo });

      await expect(
        rfqUseCases.createRfq({
          partNumber: "PART-123",
          description: "Test",
          quantity: 10,
          neededBy: yesterday,
          userId: "user-1",
        }),
      ).rejects.toThrow(ValidationError);

      expect(mockRfqRepo.create).not.toHaveBeenCalled();
    });

    it("RFQUseCases.updateRfq should throw ValidationError when neededBy is updated to past date", async () => {
      const mockRfqRepo: any = {
        findById: vi.fn().mockResolvedValue({ id: "rfq-1", userId: "user-1" }),
        update: vi.fn(),
      };
      const rfqUseCases = new RFQUseCases({ RFQRepository: mockRfqRepo });

      await expect(
        rfqUseCases.updateRfq("rfq-1", { neededBy: yesterday }, "user-1"),
      ).rejects.toThrow(ValidationError);

      expect(mockRfqRepo.update).not.toHaveBeenCalled();
    });

    it("QuotationUseCases.createQuotation should throw ValidationError when validUntil is in the past", async () => {
      const mockQuoteRepo: any = { create: vi.fn() };
      const quotationUseCases = new QuotationUseCases({
        QuotationRepository: mockQuoteRepo,
      });

      await expect(
        quotationUseCases.createQuotation({
          name: "Acme",
          rfqId: "rfq-1",
          unitPrice: 100,
          leadTime: 5,
          validUntil: yesterday,
        }),
      ).rejects.toThrow(ValidationError);

      expect(mockQuoteRepo.create).not.toHaveBeenCalled();
    });
  });
});
