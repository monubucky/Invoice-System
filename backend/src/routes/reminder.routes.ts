import { Router } from 'express';
import {
  scheduleInvoiceReminders,
  listInvoiceReminders,
  triggerReminder,
  cancelInvoiceReminders,
} from '../controllers/reminder.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';

const router = Router();

router.use(authenticate);

// Get all reminders for an invoice
router.get('/:invoiceId', listInvoiceReminders);

// Schedule reminders for an invoice
router.post(
  '/:invoiceId/schedule',
  authorize('ADMIN', 'ACCOUNTANT'),
  scheduleInvoiceReminders
);

// Manually trigger a reminder (for testing)
router.post(
  '/:invoiceId/trigger',
  authorize('ADMIN', 'ACCOUNTANT'),
  triggerReminder
);

// Cancel all pending reminders for an invoice
router.delete(
  '/:invoiceId/cancel',
  authorize('ADMIN', 'ACCOUNTANT'),
  cancelInvoiceReminders
);

export default router;