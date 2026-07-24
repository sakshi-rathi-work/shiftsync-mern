// Notification DB module
import prisma from '../config/prisma';

export async function createNotification(data: {
  userId: string;
  message: string;
  entityType?: string;
  entityId?: string;
}) {
  return prisma.notification.create({ data });
}

export async function createNotificationsForTeam(teamId: string, message: string, entityType?: string, entityId?: string) {
  const members = await prisma.user.findMany({
    where: { teamId, isActive: true },
    select: { id: true },
  });
  if (members.length === 0) return;
  await prisma.notification.createMany({
    data: members.map((m) => ({ userId: m.id, message, entityType, entityId })),
  });
}

export async function listNotifications(userId: string, unreadOnly: boolean, page: number, pageSize: number) {
  const where = { userId, ...(unreadOnly ? { isRead: false } : {}) };
  const [notifications, totalCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
  ]);
  return { notifications, totalCount };
}

export async function markRead(id: string, userId: string) {
  return prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}
