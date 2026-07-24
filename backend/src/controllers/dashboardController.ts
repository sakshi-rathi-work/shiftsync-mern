import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';

export async function getDashboardMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId, role, userId } = req.user!;

    // Current week boundaries
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now.setDate(now.getDate() + mondayOffset));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [
      totalEmployees,
      totalTeams,
      pendingLeaveRequests,
      pendingSwapRequests,
      activeShiftsThisWeek,
      publishedRostersCount,
    ] = await prisma.$transaction([
      prisma.user.count({ where: { organizationId, role: 'EMPLOYEE', isActive: true } }),
      prisma.team.count({ where: { organizationId } }),
      prisma.leaveRequest.count({ where: { organizationId, status: 'PENDING' } }),
      prisma.swapRequest.count({
        where: {
          organizationId,
          ...(role === 'EMPLOYEE' ? { OR: [{ requesterId: userId }, { targetEmployeeId: userId }] } : { status: { in: ['PENDING_PEER', 'PENDING_MANAGER'] } }),
        },
      }),
      prisma.shift.count({
        where: {
          organizationId,
          startTime: { gte: weekStart, lt: weekEnd },
          roster: { status: 'PUBLISHED' },
        },
      }),
      prisma.roster.count({
        where: { organizationId, weekStart, status: 'PUBLISHED' },
      }),
    ]);

    res.json({
      data: {
        totalEmployees,
        totalTeams,
        pendingLeaveRequests,
        pendingSwapRequests,
        activeShiftsThisWeek,
        publishedRostersCount,
        weekStart: weekStart.toISOString(),
      },
    });
  } catch (err) { next(err); }
}
