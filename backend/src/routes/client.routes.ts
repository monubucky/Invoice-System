import { Router } from 'express';
import {
  listClients,
  getClient,
  createNewClient,
  updateExistingClient,
  deleteExistingClient,
  getStats,
} from '../controllers/client.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { createClientSchema, updateClientSchema } from '../utils/schemas';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/stats', getStats);
router.get('/', listClients);
router.get('/:id', getClient);
router.post('/', authorize('ADMIN', 'ACCOUNTANT'), validate(createClientSchema), createNewClient);
router.put('/:id', authorize('ADMIN', 'ACCOUNTANT'), validate(updateClientSchema), updateExistingClient);
router.delete('/:id', authorize('ADMIN'), deleteExistingClient);

export default router;