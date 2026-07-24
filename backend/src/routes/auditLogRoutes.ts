import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { getAuditLog } from '../controllers/auditLogController';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('ADMIN'), getAuditLog);

export default router;
