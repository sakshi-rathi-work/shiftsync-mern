// Roster & Shift DB module
import prisma from '../config/prisma';
import { RosterStatus, Prisma } from '@prisma/client';

// ─── Roster ────────────────────────────────────────────────────────────────

export async function findRoster(teamId: string, weekStart: Date, organizationId: string) {
  return prisma.roster.findFirst({
    where: { teamId, weekStart, organizationId },
    include: { shifts: { include: { employee: { select: { id: true, name: true, role: true } } } } },
  });
}

export async function findRosterById(id: string, organizationId: string) {
  return prisma.roster.findFirst({
    where: { id, organizationId },
    include: { shifts: { include: { employee: { select: { id: true, name: true, role: true } } } } },
  });
}

export async function createRoster(data: {
  organizationId: string;
  teamId: string;
  weekStart: Date;
}) {
  return prisma.roster.create({
    data: { ...data, status: 'DRAFT', version: 0 },
    include: { shifts: true },
  });
}

/**
 * Optimistic-lock roster update — uses updateMany + version check.
 * Returns { count: 0 } if version mismatch → caller throws 409.
 */
export async function updateRosterVersion(
  id: string,
  organizationId: string,
  expectedVersion: number,
  data: Partial<{ status: RosterStatus }>
) {
  return prisma.roster.updateMany({
    where: { id, organizationId, version: expectedVersion },
    data: { ...data, version: { increment: 1 } },
  });
}

export async function deleteRoster(id: string, organizationId: string) {
  return prisma.roster.deleteMany({ where: { id, organizationId, status: 'DRAFT' } });
}

// ─── Shifts ────────────────────────────────────────────────────────────────

export async function upsertShifts(
  rosterId: string,
  organizationId: string,
  shifts: Array<{
    id?: string;
    employeeId: string;
    startTime: Date;
    endTime: Date;
    positionLabel: string;
  }>
) {
  // Sanitize temporary client IDs
  const sanitizedShifts = shifts.map((s) => ({
    ...s,
    id: s.id && !s.id.startsWith('temp-') ? s.id : undefined,
  }));

  // Delete shifts in DB that are no longer present in incoming list
  const incomingIds = sanitizedShifts.filter((s) => s.id).map((s) => s.id as string);
  await prisma.shift.deleteMany({
    where: { rosterId, organizationId, id: { notIn: incomingIds } },
  });

  // Upsert each shift (update if existing real ID, create if new/temp ID)
  const results = await Promise.all(
    sanitizedShifts.map((s) =>
      s.id
        ? prisma.shift.update({
            where: { id: s.id },
            data: {
              employeeId: s.employeeId,
              startTime: s.startTime,
              endTime: s.endTime,
              positionLabel: s.positionLabel,
            },
            include: { employee: { select: { id: true, name: true } } },
          })
        : prisma.shift.create({
            data: {
              rosterId,
              organizationId,
              employeeId: s.employeeId,
              startTime: s.startTime,
              endTime: s.endTime,
              positionLabel: s.positionLabel,
            },
            include: { employee: { select: { id: true, name: true } } },
          })
    )
  );
  return results;
}

export async function getShiftsForEmployee(employeeId: string, organizationId: string, weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return prisma.shift.findMany({
    where: {
      organizationId,
      employeeId,
      startTime: { gte: weekStart, lt: weekEnd },
      roster: { status: 'PUBLISHED' },
    },
    include: { roster: { select: { id: true, weekStart: true, status: true } } },
    orderBy: { startTime: 'asc' },
  });
}

export async function getEmployeeWeeklyHours(
  employeeId: string,
  organizationId: string,
  weekStart: Date
): Promise<number> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const shifts = await prisma.shift.findMany({
    where: { organizationId, employeeId, startTime: { gte: weekStart, lt: weekEnd } },
    select: { startTime: true, endTime: true },
  });
  return shifts.reduce((total, s) => {
    const hours = (s.endTime.getTime() - s.startTime.getTime()) / 3_600_000;
    return total + hours;
  }, 0);
}
