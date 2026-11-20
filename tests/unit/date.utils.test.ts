import { describe, it, expect } from "vitest";
import {
  calculateLeadTimeDate,
  calculateLeadTimeDays,
} from "../../src/shared/utils/date.utils";

describe("Date Utilities", () => {
  describe("calculateLeadTimeDate", () => {
    it("should calculate lead time date correctly from days", () => {
      const result = calculateLeadTimeDate(5);
      const expected = new Date();
      expected.setDate(expected.getDate() + 5);

      expect(result.getDate()).toBe(expected.getDate());
      expect(result.getMonth()).toBe(expected.getMonth());
      expect(result.getFullYear()).toBe(expected.getFullYear());
    });

    it("should handle string numbers for lead time days", () => {
      const result = calculateLeadTimeDate("3");
      const expected = new Date();
      expected.setDate(expected.getDate() + 3);

      expect(result.getDate()).toBe(expected.getDate());
    });

    it("should parse date string if already formatted", () => {
      const result = calculateLeadTimeDate("2026-11-25");
      expect(result.toISOString()).toContain("2026-11-25");
    });
  });

  describe("calculateLeadTimeDays", () => {
    it("should calculate days between createdAt and leadTime", () => {
      const createdAt = new Date("2026-11-20");
      const leadTime = new Date("2026-11-25");

      const days = calculateLeadTimeDays(leadTime, createdAt);
      expect(days).toBe(5);
    });
  });
});
