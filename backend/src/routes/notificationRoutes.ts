import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { getNotifications, readNotification, readAllNotifications } from '../controllers/notificationController';

const router = Router();
router.use(authenticate);

router.get('/', getNotifications);
router.patch('/read-all', readAllNotifications);
router.patch('/:id/read', readNotification);

export default router;
