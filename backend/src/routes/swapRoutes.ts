import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import {
  listSwapRequests,
  createSwapRequest,
  peerApproveSwap,
  managerApproveSwap,
  rejectSwap,
} from '../controllers/swapController';

const router = Router();
router.use(authenticate);

router.get('/', listSwapRequests);
router.post('/', createSwapRequest);
router.post('/:id/peer-approve', peerApproveSwap);
router.post('/:id/manager-approve', requireRole('ADMIN', 'MANAGER'), managerApproveSwap);
router.post('/:id/reject', rejectSwap);

export default router;
