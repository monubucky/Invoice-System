import { Router } from 'express';
import {
  listInvoices,
  getInvoice,
  createNewInvoice,
  updateExistingInvoice,
  deleteExistingInvoice,
  sendExistingInvoice,
  duplicateExistingInvoice,
  getSummary,
  downloadPDF,
  sendInvoiceByEmail,
} from '../controllers/invoice.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { createInvoiceSchema, updateInvoiceSchema } from '../utils/schemas';

const router = Router();

router.use(authenticate);

router.get('/summary', getSummary);
router.get('/', listInvoices);
router.get('/:id', getInvoice);
router.post(
  '/',
  authorize('ADMIN', 'ACCOUNTANT'),
  validate(createInvoiceSchema),
  createNewInvoice
);
router.put(
  '/:id',
  authorize('ADMIN', 'ACCOUNTANT'),
  validate(updateInvoiceSchema),
  updateExistingInvoice
);
router.delete('/:id', authorize('ADMIN', 'ACCOUNTANT'), deleteExistingInvoice);
router.post('/:id/send', authorize('ADMIN', 'ACCOUNTANT'), sendExistingInvoice);
router.post('/:id/duplicate', authorize('ADMIN', 'ACCOUNTANT'), duplicateExistingInvoice);

router.get('/:id/pdf', downloadPDF);
router.post('/:id/send-email', authorize('ADMIN', 'ACCOUNTANT'), sendInvoiceByEmail);

export default router;