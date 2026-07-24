// Roster Controller
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import {
  getRoster, createDraftRoster, updateRosterShifts,
  publishRoster, deleteDraftRoster, checkConflicts,
} from '../services/rosterService';
import { findRosterById } from '../db/rosterRepository';

const shiftSchema = z.object({
  id: z.string().optional(),
  employeeId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  positionLabel: z.string().min(1),
});

// GET /api/rosters?teamId=&weekStart=
export async function getR(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { teamId, weekStart } = req.query;
    if (!teamId || !weekStart) throw new AppError(400, 'VALIDATION_ERROR', 'teamId and weekStart are required.');

    const weekStartDate = new Date(weekStart as string);
    if (isNaN(weekStartDate.getTime())) throw new AppError(400, 'VALIDATION_ERROR', 'weekStart must be a valid date.');

    const { organizationId, role } = req.user!;
    const roster = await getRoster(teamId as string, weekStartDate, organizationId, role);

    res.json({ data: roster });
  } catch (err) { next(err); }
}

// POST /api/rosters
export async function createR(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { teamId, weekStart } = req.body;
    if (!teamId || !weekStart) throw new AppError(400, 'VALIDATION_ERROR', 'teamId and weekStart are required.');

    const { organizationId, userId } = req.user!;
    const roster = await createDraftRoster(teamId, new Date(weekStart), organizationId, userId);
    res.status(201).json({ data: roster });
  } catch (err) { next(err); }
}

// PATCH /api/rosters/:id/shifts
export async function updateShifts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { version, shifts } = req.body;
    if (version === undefined) throw new AppError(400, 'VALIDATION_ERROR', 'version is required.');

    const shiftsValidation = z.array(shiftSchema).safeParse(shifts);
    if (!shiftsValidation.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid shifts data.', shiftsValidation.error.errors);

    const { organizationId, userId } = req.user!;
    const result = await updateRosterShifts(id, organizationId, version, shiftsValidation.data, userId);
    res.json({ data: result });
  } catch (err) { next(err); }
}

// POST /api/rosters/:id/publish
export async function publish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { version } = req.body;
    if (version === undefined) throw new AppError(400, 'VALIDATION_ERROR', 'version is required.');

    const { organizationId, userId } = req.user!;
    const result = await publishRoster(id, organizationId, version, userId);
    res.json({ data: result });
  } catch (err) { next(err); }
}

// GET /api/rosters/:id/conflicts
export async function getConflicts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { organizationId } = req.user!;
    const conflicts = await checkConflicts(id, organizationId);
    res.json({ data: conflicts });
  } catch (err) { next(err); }
}

// DELETE /api/rosters/:id
export async function deleteR(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { organizationId, userId } = req.user!;
    await deleteDraftRoster(id, organizationId, userId);
    res.status(204).send();
  } catch (err) { next(err); }
}

// GET /api/rosters/:id/export.csv
export async function exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { organizationId } = req.user!;

    const roster = await findRosterById(id, organizationId);
    if (!roster) throw new AppError(404, 'NOT_FOUND', 'Roster not found.');
    if (roster.status !== 'PUBLISHED') throw new AppError(409, 'CONFLICT', 'Only PUBLISHED rosters can be exported.');

    const rows = [
      'employeeName,employeeId,date,shiftStart,shiftEnd,hoursWorked,overtimeFlag',
      ...roster.shifts.map((s) => {
        const hours = (s.endTime.getTime() - s.startTime.getTime()) / 3_600_000;
        const date = s.startTime.toISOString().slice(0, 10);
        const emp = (s as { employee?: { name?: string } }).employee;
        return `"${emp?.name ?? ''}","${s.employeeId}","${date}","${s.startTime.toISOString()}","${s.endTime.toISOString()}","${hours.toFixed(2)}","${hours > 8 ? 'YES' : 'NO'}"`;
      }),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="roster-${id}.csv"`);
    res.send(rows);
  } catch (err) { next(err); }
}
