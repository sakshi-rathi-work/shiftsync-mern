import { Request, Response, NextFunction } from 'express';
import { listAuditLog } from '../db/auditLogRepository';

export async function getAuditLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.user!;
    const entityType = req.query.entityType as string | undefined;
    const entityId = req.query.entityId as string | undefined;
    const page = parseInt(req.query.page as string || '1');
    const pageSize = parseInt(req.query.pageSize as string || '20');
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const { entries, totalCount } = await listAuditLog({
      organizationId, entityType, entityId, from, to, page, pageSize,
    });

    res.json({ data: entries, meta: { page, pageSize, totalCount } });
  } catch (err) { next(err); }
}
