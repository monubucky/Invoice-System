import { Router } from 'express';
import {
  dashboardSummary,
  monthlyRevenue,
  statusBreakdown,
  topClients,
  taxSummary,
  exportCSV,
} from '../controllers/report.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/summary', dashboardSummary);
router.get('/revenue', monthlyRevenue);
router.get('/status', statusBreakdown);
router.get('/clients', topClients);
router.get('/tax', taxSummary);
router.get('/export', exportCSV);

export default router;