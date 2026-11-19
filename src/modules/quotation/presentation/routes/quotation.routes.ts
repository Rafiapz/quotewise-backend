import { Router } from 'express';
import { QuotationController } from '../controllers/quotation.controller';
import { validateRequest } from '../../../../shared/middleware/validateRequest';
import {
  createQuotationSchema,
  quotationIdParamSchema,
  rfqIdParamForQuotationSchema,
  quotationQuerySchema,
  quotationListQuerySchema,
} from '../validators/quotation.validator';

export const createQuotationRouter = (quotationController: QuotationController): Router => {
  const router = Router();

  // GET /api/quotations (optional query params: rfqId, page, limit, search, sortBy)
  router.get(
    '/',
    validateRequest({ query: quotationListQuerySchema }),
    quotationController.getAll
  );

  // GET /api/quotations/rfq/:rfqId (validates rfqId UUID param & pagination/filter query)
  router.get(
    '/rfq/:rfqId',
    validateRequest({
      params: rfqIdParamForQuotationSchema,
      query: quotationQuerySchema,
    }),
    quotationController.getByRfq
  );

  // POST /api/quotations (validates quote creation payload including rfqId)
  router.post(
    '/',
    validateRequest({ body: createQuotationSchema }),
    quotationController.create
  );

  // DELETE /api/quotations/:id (validates quotation ID UUID param)
  router.delete(
    '/:id',
    validateRequest({ params: quotationIdParamSchema }),
    quotationController.delete
  );

  return router;
};
