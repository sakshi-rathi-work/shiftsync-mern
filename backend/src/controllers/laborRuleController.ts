import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { listLaborRules, createLaborRule, updateLaborRule } from '../db/laborRuleRepository';
import { writeAuditLog } from '../db/auditLogRepository';
import { AuditAction } from '@prisma/client';

const laborRuleSchema = z.object({
  region: z.string().min(1, 'Region is required'),
  maxWeeklyHours: z.number().positive('Max weekly hours must be > 0'),
  minStaffPerShift: z.number().int().min(1, 'Min staff per shift must be >= 1'),
});

export async function getLaborRules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.user!;
    const rules = await listLaborRules(organizationId);
    res.json({ data: rules });
  } catch (err) { next(err); }
}

export async function createLaborRuleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId, userId } = req.user!;
    const parsed = laborRuleSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed.', parsed.error.errors);

    const rule = await createLaborRule({ organizationId, ...parsed.data });

    await writeAuditLog({
      organizationId,
      actorUserId: userId,
      action: AuditAction.LABOR_RULE_CREATED,
      entityType: 'LaborRule',
      entityId: rule.id,
      beforeState: null,
      afterState: rule,
    });

    res.status(201).json({ data: rule });
  } catch (err) { next(err); }
}

export async function patchLaborRule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { organizationId, userId } = req.user!;
    const parsed = laborRuleSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed.', parsed.error.errors);

    const updated = await updateLaborRule(id, organizationId, parsed.data);
    if (!updated) throw new AppError(404, 'NOT_FOUND', 'Labor rule not found.');

    await writeAuditLog({
      organizationId,
      actorUserId: userId,
      action: AuditAction.LABOR_RULE_UPDATED,
      entityType: 'LaborRule',
      entityId: updated.id,
      beforeState: null,
      afterState: updated,
    });

    res.json({ data: updated });
  } catch (err) { next(err); }
}
