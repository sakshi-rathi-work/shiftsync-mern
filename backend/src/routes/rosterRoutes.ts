import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { getR, createR, updateShifts, publish, getConflicts, deleteR, exportCsv } from '../controllers/rosterController';

const router = Router();
router.use(authenticate);

router.get('/', getR);
router.post('/', requireRole('ADMIN', 'MANAGER'), createR);
router.patch('/:id/shifts', requireRole('ADMIN', 'MANAGER'), updateShifts);
router.post('/:id/publish', requireRole('ADMIN', 'MANAGER'), publish);
router.get('/:id/conflicts', requireRole('ADMIN', 'MANAGER'), getConflicts);
router.delete('/:id', requireRole('ADMIN', 'MANAGER'), deleteR);
router.get('/:id/export.csv', requireRole('ADMIN', 'MANAGER'), exportCsv);

export default router;
