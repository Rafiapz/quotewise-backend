import { describe, it, expect } from "vitest";
import { RFQEntity } from "../../src/modules/rfq/domain/entities/rfq.entity";
import { SupplierQuoteEntity } from "../../src/modules/quotation/domain/entities/quotation.entity";

describe("RFQEntity Domain Unit Tests", () => {
  describe("RFQ Status Calculation", () => {
    it("should calculate OPEN status when neededBy is in the future and there are no quotes", () => {
      const futureDate = new Date(Date.now() + 10 * 86400000);

      const rfq = new RFQEntity({
        id: "123e4567-e89b-12d3-a456-426614174000",
        partNumber: "BRG-1029",
        description: "Steel Ball Bearings",
        quantity: 500,
        neededBy: futureDate,
        userId: "user-uuid-1234",
        createdAt: new Date(),
        updatedAt: new Date(),
        quotes: [],
      });

      expect(rfq.status).toBe("OPEN");
      expect(rfq.quoteCount).toBe(0);
      expect(rfq.bestQuote).toBeNull();
    });

    it("should calculate QUOTED status when neededBy is in the future and at least one quote is still valid", () => {
      const futureDate = new Date(Date.now() + 10 * 86400000);
      const expiredDate = new Date(Date.now() - 2 * 86400000);

      const expiredQuote = new SupplierQuoteEntity({
        id: "quote-expired",
        rfqId: "rfq-1",
        name: "Old Vendor",
        unitPrice: 5.0,
        leadTime: futureDate,
        validUntil: expiredDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const validQuote = new SupplierQuoteEntity({
        id: "quote-valid",
        rfqId: "rfq-1",
        name: "Active Vendor",
        unitPrice: 10.0,
        leadTime: futureDate,
        validUntil: futureDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const rfq = new RFQEntity({
        id: "rfq-1",
        partNumber: "BRG-1029",
        description: "Steel Ball Bearings",
        quantity: 500,
        neededBy: futureDate,
        userId: "user-uuid-1234",
        createdAt: new Date(),
        updatedAt: new Date(),
        quotes: [expiredQuote, validQuote],
      });

      expect(rfq.status).toBe("QUOTED");
    });

    it("should calculate EXPIRED status when neededBy deadline has passed", () => {
      const pastDate = new Date(Date.now() - 2 * 86400000);

      const rfq = new RFQEntity({
        id: "rfq-expired",
        partNumber: "BRG-1029",
        description: "Steel Ball Bearings",
        quantity: 500,
        neededBy: pastDate,
        userId: "user-uuid-1234",
        createdAt: new Date(),
        updatedAt: new Date(),
        quotes: [],
      });

      expect(rfq.status).toBe("EXPIRED");
    });

    it("should calculate EXPIRED status when every quote is past its validUntil date even if neededBy is in the future", () => {
      const futureNeededBy = new Date(Date.now() + 15 * 86400000);
      const pastValidity1 = new Date(Date.now() - 5 * 86400000);
      const pastValidity2 = new Date(Date.now() - 1 * 86400000);

      const quote1 = new SupplierQuoteEntity({
        id: "quote-exp-1",
        rfqId: "rfq-1",
        name: "Supplier A",
        unitPrice: 100,
        leadTime: new Date(Date.now() + 5 * 86400000),
        validUntil: pastValidity1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const quote2 = new SupplierQuoteEntity({
        id: "quote-exp-2",
        rfqId: "rfq-1",
        name: "Supplier B",
        unitPrice: 120,
        leadTime: new Date(Date.now() + 6 * 86400000),
        validUntil: pastValidity2,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const rfq = new RFQEntity({
        id: "rfq-1",
        partNumber: "BRG-1029",
        description: "Steel Ball Bearings",
        quantity: 500,
        neededBy: futureNeededBy,
        userId: "user-uuid-1234",
        createdAt: new Date(),
        updatedAt: new Date(),
        quotes: [quote1, quote2],
      });

      // All quotes are expired -> RFQ status must be EXPIRED
      expect(rfq.status).toBe("EXPIRED");
    });
  });
  // best qoute logic test
  describe("Best Quote Logic (Cheapest, Valid, and Arrives in Time)", () => {
    it("should select the cheapest quote when multiple valid and on-time quotes exist", () => {
      const neededBy = new Date(Date.now() + 20 * 86400000);
      const validUntil = new Date(Date.now() + 15 * 86400000);
      const onTimeDelivery = new Date(Date.now() + 7 * 86400000);

      const expensiveQuote = new SupplierQuoteEntity({
        id: "q-expensive",
        rfqId: "rfq-1",
        name: "Premier Parts",
        unitPrice: 250,
        leadTime: onTimeDelivery,
        validUntil: validUntil,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const cheapQuote = new SupplierQuoteEntity({
        id: "q-cheap",
        rfqId: "rfq-1",
        name: "Economy Supplies",
        unitPrice: 180,
        leadTime: onTimeDelivery,
        validUntil: validUntil,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const rfq = new RFQEntity({
        id: "rfq-1",
        partNumber: "CNC-55",
        description: "CNC Milled Bracket",
        quantity: 100,
        neededBy: neededBy,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        quotes: [expensiveQuote, cheapQuote],
      });

      expect(rfq.bestQuote?.id).toBe("q-cheap");
      expect(rfq.bestQuote?.unitPrice).toBe(180);
    });

    it("A cheaper quote that would arrive late is NOT the best quote", () => {
      const neededBy = new Date(Date.now() + 10 * 86400000); // Needed in 10 days
      const validUntil = new Date(Date.now() + 15 * 86400000); // Both quotes valid

      // Cheaper quote: INR 50, but arrives in 14 days (LATE - after neededBy!)
      const cheapLateQuote = new SupplierQuoteEntity({
        id: "q-cheap-late",
        rfqId: "rfq-1",
        name: "Slow & Cheap Logistics",
        unitPrice: 50,
        leadTime: new Date(Date.now() + 14 * 86400000), // 14 days > 10 days
        validUntil: validUntil,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // More expensive quote: INR 90, but arrives in 5 days (ON TIME!)
      const onTimeQuote = new SupplierQuoteEntity({
        id: "q-ontime",
        rfqId: "rfq-1",
        name: "Express Machining Ltd",
        unitPrice: 90,
        leadTime: new Date(Date.now() + 5 * 86400000), // 5 days <= 10 days
        validUntil: validUntil,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const rfq = new RFQEntity({
        id: "rfq-1",
        partNumber: "PUMP-01",
        description: "Hydraulic Pump Assembly",
        quantity: 10,
        neededBy: neededBy,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        quotes: [cheapLateQuote, onTimeQuote],
      });

      // Must pick the on-time quote, NOT the cheaper late quote
      expect(rfq.bestQuote?.id).toBe("q-ontime");
      expect(rfq.bestQuote?.name).toBe("Express Machining Ltd");
      expect(rfq.bestQuote?.unitPrice).toBe(90);
    });

    it("A cheaper quote whose validUntil date has passed is NOT the best quote", () => {
      const neededBy = new Date(Date.now() + 20 * 86400000);

      // Cheaper quote: INR 40, arrives on time, but quote EXPIRED 2 days ago
      const expiredQuote = new SupplierQuoteEntity({
        id: "q-expired",
        rfqId: "rfq-1",
        name: "Expired Supplier Quote",
        unitPrice: 40,
        leadTime: new Date(Date.now() + 5 * 86400000),
        validUntil: new Date(Date.now() - 2 * 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Valid quote: INR 85, arrives on time, valid for 10 more days
      const validQuote = new SupplierQuoteEntity({
        id: "q-valid",
        rfqId: "rfq-1",
        name: "Reliable Supplier Co.",
        unitPrice: 85,
        leadTime: new Date(Date.now() + 7 * 86400000),
        validUntil: new Date(Date.now() + 10 * 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const rfq = new RFQEntity({
        id: "rfq-1",
        partNumber: "GEAR-400",
        description: "Spur Gear 400mm",
        quantity: 25,
        neededBy: neededBy,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        quotes: [expiredQuote, validQuote],
      });

      expect(rfq.bestQuote?.id).toBe("q-valid");
      expect(rfq.bestQuote?.unitPrice).toBe(85);
    });

    it("should return null if all quotes arrive late or are expired", () => {
      const neededBy = new Date(Date.now() + 5 * 86400000);

      const lateQuote = new SupplierQuoteEntity({
        id: "q-late",
        rfqId: "rfq-1",
        name: "Late Vendor",
        unitPrice: 10,
        leadTime: new Date(Date.now() + 10 * 86400000), // arrives in 10 days, needed in 5
        validUntil: new Date(Date.now() + 10 * 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const expiredQuote = new SupplierQuoteEntity({
        id: "q-expired",
        rfqId: "rfq-1",
        name: "Expired Vendor",
        unitPrice: 20,
        leadTime: new Date(Date.now() + 3 * 86400000),
        validUntil: new Date(Date.now() - 1 * 86400000), // expired
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const rfq = new RFQEntity({
        id: "rfq-1",
        partNumber: "SEAL-99",
        description: "O-Ring Seal Pack",
        quantity: 200,
        neededBy: neededBy,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        quotes: [lateQuote, expiredQuote],
      });

      expect(rfq.bestQuote).toBeNull();
    });

    it("should break price ties by selecting the quote that arrives earlier", () => {
      const neededBy = new Date(Date.now() + 30 * 86400000);
      const validUntil = new Date(Date.now() + 15 * 86400000);

      const slowerQuote = new SupplierQuoteEntity({
        id: "q-slower",
        rfqId: "rfq-1",
        name: "Standard Freight",
        unitPrice: 100,
        leadTime: new Date(Date.now() + 12 * 86400000), // 12 days
        validUntil: validUntil,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const fasterQuote = new SupplierQuoteEntity({
        id: "q-faster",
        rfqId: "rfq-1",
        name: "Express Freight",
        unitPrice: 100, // Same price!
        leadTime: new Date(Date.now() + 4 * 86400000), // 4 days (earlier!)
        validUntil: validUntil,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const rfq = new RFQEntity({
        id: "rfq-1",
        partNumber: "VALVE-12",
        description: "Butterfly Valve",
        quantity: 50,
        neededBy: neededBy,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        quotes: [slowerQuote, fasterQuote],
      });

      expect(rfq.bestQuote?.id).toBe("q-faster");
      expect(rfq.bestQuote?.name).toBe("Express Freight");
    });
  });
});
