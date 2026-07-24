// Roster Service — business logic for roster CRUD, conflict detection, publish
import {
  findRoster, findRosterById, createRoster,
  updateRosterVersion, deleteRoster, upsertShifts,
} from '../db/rosterRepository';
import { findTeamById } from '../db/teamRepository';
import { getLaborRule } from '../db/laborRuleRepository';
import { writeAuditLog } from '../db/auditLogRepository';
import { createNotificationsForTeam } from '../db/notificationRepository';
import { ruleEngine } from './ruleEngineService';
import { AppError } from '../middleware/errorHandler';
import { AuditAction } from '@prisma/client';
import { redis, isRedisAvailable } from '../config/redis';

const CACHE_TTL = 300; // 5 minutes

function rosterCacheKey(orgId: string, teamId: string, weekStart: string) {
  return `roster:${orgId}:${teamId}:${weekStart}`;
}

async function invalidateRosterCache(orgId: string, teamId: string, weekStart: string) {
  if (!isRedisAvailable()) return;
  await redis()!.del(rosterCacheKey(orgId, teamId, weekStart));
}

// GET roster for a team/week
export async function getRoster(
  teamId: string,
  weekStart: Date,
  organizationId: string,
  role: string
) {
  const cacheKey = rosterCacheKey(organizationId, teamId, weekStart.toISOString().slice(0, 10));

  // Try cache
  if (isRedisAvailable()) {
    const cached = await redis()!.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const roster = await findRoster(teamId, weekStart, organizationId);
  if (!roster) return null;

  // EMPLOYEE: only see PUBLISHED rosters
  if (role === 'EMPLOYEE' && roster.status !== 'PUBLISHED') return null;

  // Cache if PUBLISHED
  if (roster.status === 'PUBLISHED' && isRedisAvailable()) {
    await redis()!.setex(cacheKey, CACHE_TTL, JSON.stringify(roster));
  }

  return roster;
}

// POST /rosters — create DRAFT
export async function createDraftRoster(
  teamId: string,
  weekStart: Date,
  organizationId: string,
  actorUserId: string
) {
  // Check no existing roster for this team/week
  const existing = await findRoster(teamId, weekStart, organizationId);
  if (existing) throw new AppError(409, 'CONFLICT', 'A roster already exists for this team and week.');

  const roster = await createRoster({ organizationId, teamId, weekStart });

  await writeAuditLog({
    organizationId, actorUserId,
    action: AuditAction.ROSTER_CREATED,
    entityType: 'Roster', entityId: roster.id,
    beforeState: null, afterState: { id: roster.id, teamId, weekStart, status: 'DRAFT' },
  });

  return roster;
}

// PATCH /rosters/:id/shifts — bulk upsert shifts in a DRAFT roster
export async function updateRosterShifts(
  rosterId: string,
  organizationId: string,
  expectedVersion: number,
  shiftsInput: Array<{
    id?: string;
    employeeId: string;
    startTime: string;
    endTime: string;
    positionLabel: string;
  }>,
  actorUserId: string
) {
  const roster = await findRosterById(rosterId, organizationId);
  if (!roster) throw new AppError(404, 'NOT_FOUND', 'Roster not found.');
  if (roster.status !== 'DRAFT') throw new AppError(409, 'CONFLICT', 'Only DRAFT rosters can be edited.');

  // Optimistic lock check
  const updateResult = await updateRosterVersion(rosterId, organizationId, expectedVersion, {});
  if (updateResult.count === 0) {
    throw new AppError(409, 'CONFLICT', 'This roster was modified by someone else. Please reload and try again.');
  }

  const shifts = shiftsInput.map((s) => ({
    ...s,
    startTime: new Date(s.startTime),
    endTime: new Date(s.endTime),
  }));

  await upsertShifts(rosterId, organizationId, shifts);

  // Re-fetch updated roster
  const updated = await findRosterById(rosterId, organizationId);

  // Run conflict detection (non-blocking on DRAFT)
  const team = await findTeamById(roster.teamId, organizationId);
  const laborRule = await getLaborRule(organizationId, team?.region || 'DEFAULT');
  const conflicts = ruleEngine.runAll({
    organizationId,
    teamId: roster.teamId,
    weekStart: roster.weekStart,
    shifts: (updated?.shifts ?? []).map((s) => ({
      id: s.id,
      employeeId: s.employeeId,
      startTime: s.startTime,
      endTime: s.endTime,
      positionLabel: s.positionLabel,
    })),
    maxWeeklyHours: laborRule?.maxWeeklyHours ?? 48,
    minStaffPerShift: laborRule?.minStaffPerShift ?? 1,
  });

  await writeAuditLog({
    organizationId, actorUserId,
    action: AuditAction.ROSTER_UPDATED,
    entityType: 'Roster', entityId: rosterId,
    beforeState: { version: expectedVersion },
    afterState: { version: expectedVersion + 1, shiftCount: shifts.length },
  });

  await invalidateRosterCache(organizationId, roster.teamId, roster.weekStart.toISOString().slice(0, 10));

  return { roster: updated, conflicts };
}

// POST /rosters/:id/publish — DRAFT → PUBLISHED
export async function publishRoster(
  rosterId: string,
  organizationId: string,
  expectedVersion: number,
  actorUserId: string
) {
  const roster = await findRosterById(rosterId, organizationId);
  if (!roster) throw new AppError(404, 'NOT_FOUND', 'Roster not found.');
  if (roster.status !== 'DRAFT') {
    throw new AppError(409, 'CONFLICT', 'Only DRAFT rosters can be published.');
  }

  const team = await findTeamById(roster.teamId, organizationId);
  const laborRule = await getLaborRule(organizationId, team?.region || 'DEFAULT');
  const conflicts = ruleEngine.runAll({
    organizationId,
    teamId: roster.teamId,
    weekStart: roster.weekStart,
    shifts: roster.shifts.map((s) => ({
      id: s.id,
      employeeId: s.employeeId,
      startTime: s.startTime,
      endTime: s.endTime,
      positionLabel: s.positionLabel,
    })),
    maxWeeklyHours: laborRule?.maxWeeklyHours ?? 48,
    minStaffPerShift: laborRule?.minStaffPerShift ?? 1,
  });

  // BLOCKING conflicts prevent publish
  if (ruleEngine.hasBlockingConflicts(conflicts)) {
    throw new AppError(409, 'CONFLICT', 'Roster has blocking conflicts that must be resolved before publishing.', conflicts as unknown[]);
  }

  const updateResult = await updateRosterVersion(rosterId, organizationId, expectedVersion, { status: 'PUBLISHED' });
  if (updateResult.count === 0) {
    throw new AppError(409, 'CONFLICT', 'This roster was modified by someone else. Please reload and try again.');
  }

  await writeAuditLog({
    organizationId, actorUserId,
    action: AuditAction.ROSTER_PUBLISHED,
    entityType: 'Roster', entityId: rosterId,
    beforeState: { status: 'DRAFT', version: expectedVersion },
    afterState: { status: 'PUBLISHED', version: expectedVersion + 1 },
  });

  // Notify all team members
  await createNotificationsForTeam(
    roster.teamId,
    `Your roster for the week of ${roster.weekStart.toDateString()} has been published.`,
    'Roster',
    rosterId
  );

  await invalidateRosterCache(organizationId, roster.teamId, roster.weekStart.toISOString().slice(0, 10));

  const updated = await findRosterById(rosterId, organizationId);
  // Return WARNING conflicts alongside success
  return { roster: updated, conflicts };
}

// DELETE /rosters/:id — only DRAFT rosters
export async function deleteDraftRoster(rosterId: string, organizationId: string, actorUserId: string) {
  const roster = await findRosterById(rosterId, organizationId);
  if (!roster) throw new AppError(404, 'NOT_FOUND', 'Roster not found.');
  if (roster.status !== 'DRAFT') throw new AppError(409, 'CONFLICT', 'Only DRAFT rosters can be deleted.');

  await deleteRoster(rosterId, organizationId);

  await writeAuditLog({
    organizationId, actorUserId,
    action: AuditAction.ROSTER_DELETED,
    entityType: 'Roster', entityId: rosterId,
    beforeState: { status: 'DRAFT' }, afterState: { deleted: true },
  });
}

// GET /rosters/:id/conflicts — check without saving
export async function checkConflicts(rosterId: string, organizationId: string) {
  const roster = await findRosterById(rosterId, organizationId);
  if (!roster) throw new AppError(404, 'NOT_FOUND', 'Roster not found.');

  const team = await findTeamById(roster.teamId, organizationId);
  const laborRule = await getLaborRule(organizationId, team?.region || 'DEFAULT');
  return ruleEngine.runAll({
    organizationId,
    teamId: roster.teamId,
    weekStart: roster.weekStart,
    shifts: roster.shifts.map((s) => ({
      id: s.id,
      employeeId: s.employeeId,
      startTime: s.startTime,
      endTime: s.endTime,
      positionLabel: s.positionLabel,
    })),
    maxWeeklyHours: laborRule?.maxWeeklyHours ?? 48,
    minStaffPerShift: laborRule?.minStaffPerShift ?? 1,
  });
}
