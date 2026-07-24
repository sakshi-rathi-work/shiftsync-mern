import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import {
  listLeaveRequests,
  createLeaveRequest,
  approveLeave,
  rejectLeave,
  cancelLeave,
} from '../controllers/leaveController';

const router = Router();
router.use(authenticate);

router.get('/', listLeaveRequests);
router.post('/', createLeaveRequest);
router.post('/:id/approve', requireRole('ADMIN', 'MANAGER'), approveLeave);
router.post('/:id/reject', requireRole('ADMIN', 'MANAGER'), rejectLeave);
router.post('/:id/cancel', cancelLeave);

export default router;
