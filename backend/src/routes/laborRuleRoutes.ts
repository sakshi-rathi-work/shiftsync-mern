import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { getLaborRules, createLaborRuleHandler, patchLaborRule } from '../controllers/laborRuleController';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('ADMIN', 'MANAGER'), getLaborRules);
router.post('/', requireRole('ADMIN'), createLaborRuleHandler);
router.patch('/:id', requireRole('ADMIN'), patchLaborRule);

export default router;
