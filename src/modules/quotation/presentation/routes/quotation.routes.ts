import { Router } from 'express';
import { QuotationController } from '../controllers/quotation.controller';
import { validateRequest } from '../../../../shared/middleware/validateRequest';
import {
  createQuotationSchema,
  rfqIdParamForQuotationSchema,
} from '../../application/dto/quotation.dto';

export const createQuotationRouter = (quotationController: QuotationController): Router => {
  const router = Router();

  router.get('/', quotationController.getAll);

  router.get(
    '/rfq/:rfqId',
    validateRequest({ params: rfqIdParamForQuotationSchema }),
    quotationController.getByRfq
  );

  router.post(
    '/',
    validateRequest({ body: createQuotationSchema }),
    quotationController.create
  );

  return router;
};
