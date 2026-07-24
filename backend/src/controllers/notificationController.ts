import { Request, Response, NextFunction } from 'express';
import { listNotifications, markRead, markAllRead } from '../db/notificationRepository';

export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.user!;
    const unreadOnly = req.query.unreadOnly === 'true';
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '20');

    const { notifications, totalCount } = await listNotifications(userId, unreadOnly, page, pageSize);
    res.json({ data: notifications, meta: { page, pageSize, totalCount } });
  } catch (err) { next(err); }
}

export async function readNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { userId } = req.user!;
    await markRead(id, userId);
    res.json({ data: { message: 'Notification marked as read.' } });
  } catch (err) { next(err); }
}

export async function readAllNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.user!;
    await markAllRead(userId);
    res.json({ data: { message: 'All notifications marked as read.' } });
  } catch (err) { next(err); }
}
