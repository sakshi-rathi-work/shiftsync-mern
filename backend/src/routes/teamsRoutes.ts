import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { getTeams, createTeamHandler, patchTeam, getMembers } from '../controllers/teamsController';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('ADMIN', 'MANAGER'), getTeams);
router.post('/', requireRole('ADMIN'), createTeamHandler);
router.patch('/:id', requireRole('ADMIN'), patchTeam);
router.get('/:id/members', requireRole('ADMIN', 'MANAGER'), getMembers);

export default router;
