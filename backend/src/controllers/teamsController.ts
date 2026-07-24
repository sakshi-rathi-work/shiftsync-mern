// Teams Controller
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { listTeams, findTeamById, createTeam, updateTeam, getTeamMembers } from '../db/teamRepository';

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  managerId: z.string().min(1, 'Manager ID is required'),
  region: z.string().optional().default('DEFAULT'),
});

const patchTeamSchema = z.object({
  name: z.string().min(1).optional(),
  managerId: z.string().optional(),
  region: z.string().optional(),
}).strict();

// GET /api/teams
export async function getTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId, role, userId } = req.user!;
    // MANAGER sees only teams they manage; ADMIN sees all
    const managerId = role === 'MANAGER' ? userId : undefined;
    const teams = await listTeams(organizationId, managerId);
    res.json({ data: teams });
  } catch (err) { next(err); }
}

// POST /api/teams
export async function createTeamHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.user!;
    const parsed = createTeamSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed.', parsed.error.errors);

    const team = await createTeam({ organizationId, ...parsed.data });
    res.status(201).json({ data: team });
  } catch (err) { next(err); }
}

// PATCH /api/teams/:id
export async function patchTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { organizationId } = req.user!;
    const parsed = patchTeamSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed.', parsed.error.errors);

    const updated = await updateTeam(id, organizationId, parsed.data);
    if (!updated) throw new AppError(404, 'NOT_FOUND', 'Team not found.');
    res.json({ data: updated });
  } catch (err) { next(err); }
}

// GET /api/teams/:id/members
export async function getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { organizationId, role, userId } = req.user!;

    // MANAGER can only see their own team members
    if (role === 'MANAGER') {
      const team = await findTeamById(id, organizationId);
      if (!team || team.managerId !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'You do not manage this team.');
      }
    }

    const members = await getTeamMembers(id, organizationId);
    res.json({ data: members });
  } catch (err) { next(err); }
}
