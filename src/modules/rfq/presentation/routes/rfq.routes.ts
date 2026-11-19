import { Router, RequestHandler } from 'express';
import { RFQController } from '../controllers/rfq.controller';
import { QuotationController } from '../../../quotation/presentation/controllers/quotation.controller';
import { validateRequest } from '../../../../shared/middleware/validateRequest';
import { createRfqSchema, rfqIdParamSchema } from '../../application/dto/rfq.dto';

export const createRfqRouter = (
  rfqController: RFQController,
  quotationController?: QuotationController,
  authMiddleware?: RequestHandler
): Router => {
  const router = Router();

  if (authMiddleware) {
    router.use(authMiddleware);
  }

  router.get('/', rfqController.getAll);

  router.get(
    '/:id',
    validateRequest({ params: rfqIdParamSchema }),
    rfqController.getById
  );

  router.post(
    '/',
    validateRequest({ body: createRfqSchema }),
    rfqController.create
  );

  if (quotationController) {
    router.get(
      '/:rfqId/quotations',
      quotationController.getByRfq
    );
    router.post(
      '/:rfqId/quotations',
      quotationController.create
    );
  }

  return router;
};
