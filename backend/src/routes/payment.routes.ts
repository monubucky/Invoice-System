import { Router } from 'express';
import {
  listPayments,
  listPaymentsByInvoice,
  createPayment,
  removePayment,
  stripeCheckout,
  stripeWebhook,
  paymentSummary,
} from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { recordPaymentSchema, stripeCheckoutSchema } from '../utils/schemas';

const router = Router();

// ⚠️ Stripe webhook must use raw body — register BEFORE express.json()
// We handle this in app.ts

router.get('/summary', authenticate, paymentSummary);
router.get('/', authenticate, listPayments);
router.get('/invoice/:invoiceId', authenticate, listPaymentsByInvoice);
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'ACCOUNTANT'),
  validate(recordPaymentSchema),
  createPayment
);
router.delete('/:id', authenticate, authorize('ADMIN', 'ACCOUNTANT'), removePayment);
router.post(
  '/stripe/checkout',
  authenticate,
  authorize('ADMIN', 'ACCOUNTANT'),
  validate(stripeCheckoutSchema),
  stripeCheckout
);

export default router;