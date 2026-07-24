import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { getDashboardMetrics } from '../controllers/dashboardController';

const router = Router();
router.use(authenticate);

router.get('/metrics', getDashboardMetrics);

export default router;
