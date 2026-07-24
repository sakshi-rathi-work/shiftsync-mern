import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { getUsers, createUserHandler, patchUser, deactivateUser } from '../controllers/usersController';

const router = Router();

router.use(authenticate);

router.get('/',     requireRole('ADMIN', 'MANAGER'), getUsers);
router.post('/',    requireRole('ADMIN'), createUserHandler);
router.patch('/:id', patchUser); // employees can patch own hasOnboarded — controller enforces scope
router.patch('/:id/deactivate', requireRole('ADMIN'), deactivateUser);

export default router;
