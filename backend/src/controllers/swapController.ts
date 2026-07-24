// Swap Request Controller
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import prisma from '../config/prisma';
import { writeAuditLog } from '../db/auditLogRepository';
import { createNotification } from '../db/notificationRepository';
import { AuditAction, SwapStatus, Prisma } from '@prisma/client';

const createSwapSchema = z.object({
  offeredShiftId: z.string(),
  requestedShiftId: z.string(),
  reason: z.string().min(1),
});

// GET /api/swap-requests
export async function listSwapRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId, role, userId } = req.user!;
    const status = req.query.status as SwapStatus | undefined;
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '20');

    const where: Prisma.SwapRequestWhereInput = { organizationId };
    if (status) where.status = status;
    if (role === 'EMPLOYEE') {
      where.OR = [{ requesterId: userId }, { targetEmployeeId: userId }];
    }

    const [requests, totalCount] = await prisma.$transaction([
      prisma.swapRequest.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          targetEmployee: { select: { id: true, name: true, email: true } },
          requesterShift: true,
          targetShift: true,
        },
      }),
      prisma.swapRequest.count({ where }),
    ]);

    res.json({ data: requests, meta: { page, pageSize, totalCount } });
  } catch (err) { next(err); }
}

// POST /api/swap-requests
export async function createSwapRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId, userId } = req.user!;
    const parsed = createSwapSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed.', parsed.error.errors);

    const offeredShift = await prisma.shift.findFirst({
      where: { id: parsed.data.offeredShiftId, organizationId, employeeId: userId },
    });
    if (!offeredShift) throw new AppError(400, 'VALIDATION_ERROR', 'Offered shift not found or does not belong to you.');

    const requestedShift = await prisma.shift.findFirst({
      where: { id: parsed.data.requestedShiftId, organizationId },
      include: { employee: true },
    });
    if (!requestedShift) throw new AppError(400, 'VALIDATION_ERROR', 'Requested shift not found.');
    if (requestedShift.employeeId === userId) throw new AppError(400, 'VALIDATION_ERROR', 'You cannot swap with yourself.');

    const swap = await prisma.swapRequest.create({
      data: {
        organizationId,
        requesterId: userId,
        targetEmployeeId: requestedShift.employeeId,
        requesterShiftId: parsed.data.offeredShiftId,
        targetShiftId: parsed.data.requestedShiftId,
        managerComment: parsed.data.reason,
      },
      include: { requester: { select: { id: true, name: true } } },
    });

    await writeAuditLog({
      organizationId, actorUserId: userId,
      action: AuditAction.SWAP_SUBMITTED,
      entityType: 'SwapRequest', entityId: swap.id,
      beforeState: null, afterState: { status: 'PENDING_PEER' },
    });
    await createNotification({
      userId: requestedShift.employeeId,
      message: `You have a new shift swap request from ${swap.requester.name}.`,
      entityType: 'SwapRequest', entityId: swap.id,
    });

    res.status(201).json({ data: swap });
  } catch (err) { next(err); }
}

// POST /api/swap-requests/:id/peer-approve
export async function peerApproveSwap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { organizationId, userId } = req.user!;

    const swap = await prisma.swapRequest.findFirst({ where: { id, organizationId } });
    if (!swap) throw new AppError(404, 'NOT_FOUND', 'Swap request not found.');
    if (swap.targetEmployeeId !== userId) throw new AppError(403, 'FORBIDDEN', 'You are not the target of this swap request.');
    if (swap.status !== 'PENDING_PEER') throw new AppError(409, 'CONFLICT', `Cannot approve from status ${swap.status}.`);

    const updated = await prisma.swapRequest.update({ where: { id }, data: { status: 'PENDING_MANAGER' } });

    const requesterWithTeam = await prisma.user.findUnique({
      where: { id: swap.requesterId },
      include: { team: { include: { manager: true } } },
    });
    if (requesterWithTeam?.team?.manager?.id) {
      await createNotification({
        userId: requesterWithTeam.team.manager.id,
        message: `Swap request from ${requesterWithTeam.name} is awaiting your approval.`,
        entityType: 'SwapRequest', entityId: id,
      });
    }

    await writeAuditLog({
      organizationId, actorUserId: userId,
      action: AuditAction.SWAP_PEER_ACCEPTED,
      entityType: 'SwapRequest', entityId: id,
      beforeState: { status: 'PENDING_PEER' }, afterState: { status: 'PENDING_MANAGER' },
    });

    res.json({ data: updated });
  } catch (err) { next(err); }
}

// POST /api/swap-requests/:id/manager-approve
export async function managerApproveSwap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { organizationId, userId } = req.user!;
    const swap = await prisma.swapRequest.findFirst({
      where: { id, organizationId },
      include: { requesterShift: true, targetShift: true },
    });
    if (!swap) throw new AppError(404, 'NOT_FOUND', 'Swap request not found.');
    if (swap.status !== 'PENDING_MANAGER') throw new AppError(409, 'CONFLICT', `Cannot approve from status ${swap.status}.`);

    await prisma.$transaction([
      prisma.swapRequest.update({ where: { id }, data: { status: 'APPROVED' } }),
      prisma.shift.update({ where: { id: swap.requesterShiftId }, data: { employeeId: swap.targetEmployeeId } }),
      prisma.shift.update({ where: { id: swap.targetShiftId }, data: { employeeId: swap.requesterId } }),
    ]);

    await writeAuditLog({
      organizationId, actorUserId: userId,
      action: AuditAction.SWAP_APPROVED,
      entityType: 'SwapRequest', entityId: id,
      beforeState: { status: 'PENDING_MANAGER' }, afterState: { status: 'APPROVED' },
    });
    await createNotification({ userId: swap.requesterId, message: 'Your shift swap request has been approved by your manager!', entityType: 'SwapRequest', entityId: id });
    await createNotification({ userId: swap.targetEmployeeId, message: 'Your shift swap has been approved by the manager!', entityType: 'SwapRequest', entityId: id });

    const updated = await prisma.swapRequest.findUnique({ where: { id } });
    res.json({ data: updated });
  } catch (err) { next(err); }
}

// POST /api/swap-requests/:id/reject
export async function rejectSwap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { organizationId, userId, role } = req.user!;
    const swap = await prisma.swapRequest.findFirst({ where: { id, organizationId } });
    if (!swap) throw new AppError(404, 'NOT_FOUND', 'Swap request not found.');

    const canReject = role === 'MANAGER' || role === 'ADMIN' || swap.targetEmployeeId === userId;
    if (!canReject) throw new AppError(403, 'FORBIDDEN', 'You cannot reject this swap request.');
    if (!['PENDING_PEER', 'PENDING_MANAGER'].includes(swap.status)) {
      throw new AppError(409, 'CONFLICT', `Cannot reject from status ${swap.status}.`);
    }

    const updated = await prisma.swapRequest.update({ where: { id }, data: { status: 'REJECTED' } });

    await writeAuditLog({
      organizationId, actorUserId: userId,
      action: AuditAction.SWAP_REJECTED,
      entityType: 'SwapRequest', entityId: id,
      beforeState: { status: swap.status }, afterState: { status: 'REJECTED' },
    });
    await createNotification({ userId: swap.requesterId, message: 'Your shift swap request has been rejected.', entityType: 'SwapRequest', entityId: id });

    res.json({ data: updated });
  } catch (err) { next(err); }
}
