import { Router } from 'express';
import { getBusiness, updateBusiness } from '../controllers/business.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateBusinessSchema } from '../utils/schemas';

const router = Router();

router.get('/', authenticate, getBusiness);
router.put('/', authenticate, authorize('ADMIN'), validate(updateBusinessSchema), updateBusiness);

export default router;