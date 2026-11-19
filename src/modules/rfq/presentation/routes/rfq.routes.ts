import { Router, RequestHandler } from 'express';
import { RFQController } from '../controllers/rfq.controller';
import { QuotationController } from '../../../quotation/presentation/controllers/quotation.controller';
import { validateRequest } from '../../../../shared/middleware/validateRequest';
import {
  createRfqSchema,
  updateRfqSchema,
  rfqIdParamSchema,
  rfqQuerySchema,
} from '../validators/rfq.validator';
import {
  rfqIdParamForQuotationSchema,
  quotationQuerySchema,
  createQuotationForRfqBodySchema,
} from '../../../quotation/presentation/validators/quotation.validator';

export const createRfqRouter = (
  rfqController: RFQController,
  quotationController?: QuotationController,
  authMiddleware?: RequestHandler
): Router => {
  const router = Router();

  if (authMiddleware) {
    router.use(authMiddleware);
  }

  // GET /api/rfqs (validated query: page, limit, search, status, userId)
  router.get(
    '/',
    validateRequest({ query: rfqQuerySchema }),
    rfqController.getAll
  );

  // GET /api/rfqs/:id (validated path param: id as UUID)
  router.get(
    '/:id',
    validateRequest({ params: rfqIdParamSchema }),
    rfqController.getById
  );

  // POST /api/rfqs (validated request body)
  router.post(
    '/',
    validateRequest({ body: createRfqSchema }),
    rfqController.create
  );

  // PUT /api/rfqs/:id (validated path param: id as UUID & partial update body)
  router.put(
    '/:id',
    validateRequest({
      params: rfqIdParamSchema,
      body: updateRfqSchema,
    }),
    rfqController.update
  );

  // DELETE /api/rfqs/:id (validated path param: id as UUID)
  router.delete(
    '/:id',
    validateRequest({ params: rfqIdParamSchema }),
    rfqController.delete
  );

  // Nested quotation endpoints under /api/rfqs/:rfqId/quotations
  if (quotationController) {
    // GET /api/rfqs/:rfqId/quotations (validated rfqId UUID param & query pagination/sort/search)
    router.get(
      '/:rfqId/quotations',
      validateRequest({
        params: rfqIdParamForQuotationSchema,
        query: quotationQuerySchema,
      }),
      quotationController.getByRfq
    );

    // POST /api/rfqs/:rfqId/quotations (validated rfqId UUID param & body payload)
    router.post(
      '/:rfqId/quotations',
      validateRequest({
        params: rfqIdParamForQuotationSchema,
        body: createQuotationForRfqBodySchema,
      }),
      quotationController.create
    );
  }

  return router;
};
