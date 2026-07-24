// Leave Request Controller
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import prisma from '../config/prisma';
import { writeAuditLog } from '../db/auditLogRepository';
import { createNotification } from '../db/notificationRepository';
import { AuditAction, LeaveStatus, Prisma } from '@prisma/client';

const createLeaveSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().min(1),
});

const actionSchema = z.object({ comment: z.string().optional() });

function assertTransition(current: LeaveStatus, allowed: LeaveStatus[]) {
  if (!allowed.includes(current)) {
    throw new AppError(409, 'CONFLICT', `Cannot transition from ${current}. Allowed from: ${allowed.join(', ')}.`);
  }
}

export async function listLeaveRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId, role, userId } = req.user!;
    const status = req.query.status as LeaveStatus | undefined;
    const teamId = req.query.teamId as string | undefined;
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '20');

    const where: Prisma.LeaveRequestWhereInput = { organizationId };
    if (status) where.status = status;
    if (role === 'EMPLOYEE') where.employeeId = userId;
    else if (role === 'MANAGER' && teamId) {
      where.employee = { teamId };
    }

    const [requests, totalCount] = await prisma.$transaction([
      prisma.leaveRequest.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { employee: { select: { id: true, name: true, email: true, teamId: true } } },
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    res.json({ data: requests, meta: { page, pageSize, totalCount } });
  } catch (err) { next(err); }
}

export async function createLeaveRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId, userId } = req.user!;
    const parsed = createLeaveSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed.', parsed.error.errors);

    const leave = await prisma.leaveRequest.create({
      data: { organizationId, employeeId: userId, ...parsed.data, startDate: new Date(parsed.data.startDate), endDate: new Date(parsed.data.endDate) },
      include: { employee: { select: { id: true, name: true } } },
    });

    await writeAuditLog({ organizationId, actorUserId: userId, action: AuditAction.LEAVE_SUBMITTED, entityType: 'LeaveRequest', entityId: leave.id, beforeState: null, afterState: { status: 'PENDING' } });

    res.status(201).json({ data: leave });
  } catch (err) { next(err); }
}

export async function approveLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { organizationId, userId } = req.user!;
    const { comment } = actionSchema.parse(req.body);

    const leave = await prisma.leaveRequest.findFirst({ where: { id, organizationId } });
    if (!leave) throw new AppError(404, 'NOT_FOUND', 'Leave request not found.');
    assertTransition(leave.status, ['PENDING']);

    const updated = await prisma.leaveRequest.update({
      where: { id }, data: { status: 'APPROVED', managerComment: comment ?? null },
    });

    await writeAuditLog({ organizationId, actorUserId: userId, action: AuditAction.LEAVE_APPROVED, entityType: 'LeaveRequest', entityId: id, beforeState: { status: 'PENDING' }, afterState: { status: 'APPROVED' } });
    await createNotification({ userId: leave.employeeId, message: `Your leave request has been approved.${comment ? ` Comment: ${comment}` : ''}`, entityType: 'LeaveRequest', entityId: id });

    res.json({ data: updated });
  } catch (err) { next(err); }
}

export async function rejectLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { organizationId, userId } = req.user!;
    const { comment } = actionSchema.parse(req.body);

    const leave = await prisma.leaveRequest.findFirst({ where: { id, organizationId } });
    if (!leave) throw new AppError(404, 'NOT_FOUND', 'Leave request not found.');
    assertTransition(leave.status, ['PENDING']);

    const updated = await prisma.leaveRequest.update({ where: { id }, data: { status: 'REJECTED', managerComment: comment ?? null } });

    await writeAuditLog({ organizationId, actorUserId: userId, action: AuditAction.LEAVE_REJECTED, entityType: 'LeaveRequest', entityId: id, beforeState: { status: 'PENDING' }, afterState: { status: 'REJECTED' } });
    await createNotification({ userId: leave.employeeId, message: `Your leave request has been rejected.${comment ? ` Comment: ${comment}` : ''}`, entityType: 'LeaveRequest', entityId: id });

    res.json({ data: updated });
  } catch (err) { next(err); }
}

export async function cancelLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { organizationId, userId } = req.user!;

    const leave = await prisma.leaveRequest.findFirst({ where: { id, organizationId } });
    if (!leave) throw new AppError(404, 'NOT_FOUND', 'Leave request not found.');
    if (leave.employeeId !== userId) throw new AppError(403, 'FORBIDDEN', 'You can only cancel your own leave requests.');

    if (leave.status === 'APPROVED' && leave.startDate <= new Date()) {
      throw new AppError(409, 'CONFLICT', 'Cannot cancel an approved leave request after its start date has passed.');
    }
    assertTransition(leave.status, ['PENDING', 'APPROVED']);

    const updated = await prisma.leaveRequest.update({ where: { id }, data: { status: 'CANCELLED' } });

    await writeAuditLog({ organizationId, actorUserId: userId, action: AuditAction.LEAVE_CANCELLED, entityType: 'LeaveRequest', entityId: id, beforeState: { status: leave.status }, afterState: { status: 'CANCELLED' } });

    res.json({ data: updated });
  } catch (err) { next(err); }
}
