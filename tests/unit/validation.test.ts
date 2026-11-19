import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { validateRequest } from '../../src/shared/middleware/validateRequest';
import { ValidationError } from '../../src/shared/errors/AppError';
import {
  createRfqSchema,
  updateRfqSchema,
  rfqIdParamSchema,
  rfqQuerySchema,
} from '../../src/modules/rfq/presentation/validators/rfq.validator';
import {
  createQuotationSchema,
  createQuotationForRfqBodySchema,
  quotationIdParamSchema,
  rfqIdParamForQuotationSchema,
  quotationQuerySchema,
  quotationListQuerySchema,
} from '../../src/modules/quotation/presentation/validators/quotation.validator';
import {
  registerBodySchema,
  loginBodySchema,
} from '../../src/modules/auth/presentation/validators/auth.validator';

describe('Zod Request Validation Middleware & Schemas', () => {
  const mockResponse = () => ({} as Response);
  const mockNext = () => vi.fn() as unknown as NextFunction;

  describe('validateRequest middleware', () => {
    it('should call next() with no errors for valid body', async () => {
      const middleware = validateRequest({ body: createRfqSchema });
      const req = {
        body: {
          partNumber: 'PART-001',
          description: 'Precision Gear',
          quantity: 25,
          neededBy: '2026-12-31T00:00:00Z',
        },
      } as Request;
      const next = vi.fn();

      await middleware(req, mockResponse(), next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body.quantity).toBe(25);
    });

    it('should throw ValidationError (422) for invalid body fields', async () => {
      const middleware = validateRequest({ body: createRfqSchema });
      const req = {
        body: {
          partNumber: '',
          quantity: -5,
          neededBy: 'invalid-date',
        },
      } as Request;
      const next = vi.fn();

      await middleware(req, mockResponse(), next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.statusCode).toBe(422);
      expect(error.errors).toHaveProperty('partNumber');
      expect(error.errors).toHaveProperty('quantity');
      expect(error.errors).toHaveProperty('neededBy');
    });

    it('should validate and coerce query parameters', async () => {
      const middleware = validateRequest({ query: rfqQuerySchema });
      const req = {
        query: {
          page: '3',
          limit: '15',
          status: 'OPEN',
          search: 'Bearing',
        },
      } as unknown as Request;
      const next = vi.fn();

      await middleware(req, mockResponse(), next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query.page).toBe(3);
      expect(req.query.limit).toBe(15);
      expect(req.query.status).toBe('OPEN');
    });

    it('should reject invalid query enum values', async () => {
      const middleware = validateRequest({ query: rfqQuerySchema });
      const req = {
        query: {
          status: 'UNKNOWN_STATUS',
        },
      } as unknown as Request;
      const next = vi.fn();

      await middleware(req, mockResponse(), next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.errors).toHaveProperty('status');
    });

    it('should validate UUID path parameters and reject malformed ones', async () => {
      const middleware = validateRequest({ params: rfqIdParamSchema });
      const validReq = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
      } as unknown as Request;
      const validNext = vi.fn();

      await middleware(validReq, mockResponse(), validNext);
      expect(validNext).toHaveBeenCalledWith();

      const invalidReq = {
        params: { id: 'invalid-non-uuid-123' },
      } as unknown as Request;
      const invalidNext = vi.fn();

      await middleware(invalidReq, mockResponse(), invalidNext);
      expect(invalidNext).toHaveBeenCalled();
      const err = invalidNext.mock.calls[0][0];
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.errors).toHaveProperty('id');
    });
  });

  describe('RFQ Zod Schemas', () => {
    it('should allow partial updates in updateRfqSchema', () => {
      const partialUpdate = { quantity: 150 };
      const parsed = updateRfqSchema.safeParse(partialUpdate);
      expect(parsed.success).toBe(true);
    });

    it('should reject non-positive quantity in updateRfqSchema', () => {
      const invalidUpdate = { quantity: 0 };
      const parsed = updateRfqSchema.safeParse(invalidUpdate);
      expect(parsed.success).toBe(false);
    });
  });

  describe('Quotation Zod Schemas', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('should validate complete quotation schema with numeric lead time', () => {
      const payload = {
        name: 'Alpha Supplier',
        rfqId: validUuid,
        unitPrice: 49.99,
        leadTime: 14,
        validUntil: '2026-12-31T00:00:00Z',
      };
      const parsed = createQuotationSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it('should validate quotation for RFQ body schema where rfqId in body is optional', () => {
      const payloadWithoutRfqId = {
        name: 'Beta Supplier',
        unitPrice: 35.5,
        leadTime: '3 weeks',
        validUntil: '2026-12-31T00:00:00Z',
      };
      const parsed = createQuotationForRfqBodySchema.safeParse(payloadWithoutRfqId);
      expect(parsed.success).toBe(true);
    });

    it('should reject negative or zero unitPrice in quotation', () => {
      const invalidPayload = {
        name: 'Beta Supplier',
        unitPrice: -10,
        leadTime: 7,
        validUntil: '2026-12-31T00:00:00Z',
      };
      const parsed = createQuotationForRfqBodySchema.safeParse(invalidPayload);
      expect(parsed.success).toBe(false);
    });

    it('should validate quotationQuerySchema and quotationListQuerySchema', () => {
      const validQuery = {
        page: '2',
        limit: '10',
        sortBy: 'lead_asc',
        rfqId: validUuid,
      };
      const parsed = quotationListQuerySchema.safeParse(validQuery);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.page).toBe(2);
        expect(parsed.data.limit).toBe(10);
        expect(parsed.data.sortBy).toBe('lead_asc');
      }

      const invalidSort = { sortBy: 'unsupported_sort' };
      expect(quotationQuerySchema.safeParse(invalidSort).success).toBe(false);
    });

    it('should validate quotationIdParamSchema and rfqIdParamForQuotationSchema', () => {
      expect(quotationIdParamSchema.safeParse({ id: validUuid }).success).toBe(true);
      expect(quotationIdParamSchema.safeParse({ id: 'bad-id' }).success).toBe(false);

      expect(rfqIdParamForQuotationSchema.safeParse({ rfqId: validUuid }).success).toBe(true);
      expect(rfqIdParamForQuotationSchema.safeParse({ rfqId: 'bad-id' }).success).toBe(false);
    });
  });

  describe('Auth Zod Schemas', () => {
    it('should reject registration passwords under 8 characters', () => {
      const result = registerBodySchema.safeParse({
        companyName: 'Acme Corp',
        email: 'acme@example.com',
        password: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid registration and login payloads', () => {
      const validReg = {
        companyName: 'Acme Corp',
        email: 'acme@example.com',
        password: 'StrongPassword123!',
      };
      expect(registerBodySchema.safeParse(validReg).success).toBe(true);

      const validLogin = {
        email: 'acme@example.com',
        password: 'StrongPassword123!',
      };
      expect(loginBodySchema.safeParse(validLogin).success).toBe(true);
    });
  });
});
