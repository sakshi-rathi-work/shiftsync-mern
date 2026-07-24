// Users Controller — ADMIN user management + self-update (hasOnboarded)
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { listUsers, createUser, updateUser } from '../db/userRepository';
import { writeAuditLog } from '../db/auditLogRepository';
import prisma from '../config/prisma';
import bcrypt from 'bcrypt';
import { Role, AuditAction } from '@prisma/client';

const patchUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
  teamId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  hasOnboarded: z.boolean().optional(),
}).strict();

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  role: z.enum(['MANAGER', 'EMPLOYEE']),
  teamId: z.string().optional(),
});

// GET /api/users
export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.user!;
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '20');
    const role = req.query.role as Role | undefined;
    const teamId = req.query.teamId as string | undefined;

    const { users, totalCount } = await listUsers(organizationId, { role, teamId, page, pageSize });

    res.json({ data: users, meta: { page, pageSize, totalCount } });
  } catch (err) { next(err); }
}

// POST /api/users  (ADMIN only)
export async function createUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed.', parsed.error.errors);

    const { organizationId, userId } = req.user!;
    const { name, email, role, teamId } = parsed.data;

    // Check email uniqueness within org
    const existing = await prisma.user.findFirst({ where: { email: email.toLowerCase() } });
    if (existing) throw new AppError(409, 'CONFLICT', 'A user with this email already exists.');

    // Generate temp password — returned ONCE in response
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await createUser({ organizationId, name, email, passwordHash, role: role as Role, teamId });

    await writeAuditLog({
      organizationId,
      actorUserId: userId,
      action: AuditAction.USER_CREATED,
      entityType: 'User',
      entityId: user.id,
      beforeState: null,
      afterState: { id: user.id, name: user.name, email: user.email, role: user.role, teamId: user.teamId },
    });

    res.status(201).json({ data: { ...user, tempPassword } });
  } catch (err) { next(err); }
}

// PATCH /api/users/:id
export async function patchUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { userId, organizationId, role } = req.user!;

    // Employees can only update their own hasOnboarded flag
    if (role === 'EMPLOYEE') {
      const allowedKeys = Object.keys(req.body);
      if (allowedKeys.some((k) => k !== 'hasOnboarded') || id !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Employees may only update their own hasOnboarded flag.');
      }
    }

    const parsed = patchUserSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed.', parsed.error.errors);

    const updated = await updateUser(id, organizationId, parsed.data);
    if (!updated) throw new AppError(404, 'NOT_FOUND', 'User not found.');

    await writeAuditLog({
      organizationId,
      actorUserId: userId,
      action: AuditAction.USER_UPDATED,
      entityType: 'User',
      entityId: updated.id,
      beforeState: null,
      afterState: { id: updated.id, name: updated.name, role: updated.role, isActive: updated.isActive },
    });

    res.json({ data: updated });
  } catch (err) { next(err); }
}

// PATCH /api/users/:id/deactivate  (ADMIN only)
export async function deactivateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { userId, organizationId } = req.user!;

    if (id === userId) throw new AppError(400, 'VALIDATION_ERROR', 'You cannot deactivate your own account.');

    const updated = await updateUser(id, organizationId, { isActive: false });
    if (!updated) throw new AppError(404, 'NOT_FOUND', 'User not found.');

    await writeAuditLog({
      organizationId,
      actorUserId: userId,
      action: AuditAction.USER_DEACTIVATED,
      entityType: 'User',
      entityId: updated.id,
      beforeState: null,
      afterState: { id: updated.id, name: updated.name, isActive: false },
    });

    res.json({ data: updated });
  } catch (err) { next(err); }
}
