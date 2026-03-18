import { Router } from 'express';
import {
  listRecurring,
  createRecurring,
  updateCycle,
  stopRecurring,
  generateNext,
} from '../controllers/recurring.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { recurringConfigSchema } from '../utils/schemas';

const router = Router();

router.use(authenticate);

router.get('/', listRecurring);
router.post(
  '/',
  authorize('ADMIN', 'ACCOUNTANT'),
  validate(recurringConfigSchema),
  createRecurring
);
router.put('/:id/cycle', authorize('ADMIN', 'ACCOUNTANT'), updateCycle);
router.post('/:id/generate', authorize('ADMIN', 'ACCOUNTANT'), generateNext);
router.delete('/:id/stop', authorize('ADMIN', 'ACCOUNTANT'), stopRecurring);

export default router;