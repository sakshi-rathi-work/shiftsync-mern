// AuditLog DB module
import prisma from '../config/prisma';
import { AuditAction, Prisma } from '@prisma/client';

export async function writeAuditLog(data: {
  organizationId: string;
  actorUserId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  beforeState?: object | null;
  afterState: object;
}) {
  return prisma.auditLogEntry.create({
    data: {
      organizationId: data.organizationId,
      actorUserId: data.actorUserId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      beforeState: data.beforeState ? (data.beforeState as Prisma.InputJsonValue) : Prisma.JsonNull,
      afterState: data.afterState as Prisma.InputJsonValue,
    },
  });
}

export async function listAuditLog(params: {
  organizationId: string;
  entityType?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}) {
  const where = {
    organizationId: params.organizationId,
    ...(params.entityType ? { entityType: params.entityType } : {}),
    ...(params.entityId ? { entityId: params.entityId } : {}),
    ...(params.from || params.to
      ? { createdAt: { ...(params.from ? { gte: params.from } : {}), ...(params.to ? { lte: params.to } : {}) } }
      : {}),
  };

  const [entries, totalCount] = await prisma.$transaction([
    prisma.auditLogEntry.findMany({
      where,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
    }),
    prisma.auditLogEntry.count({ where }),
  ]);

  return { entries, totalCount };
}
