// LaborRule DB module
import prisma from '../config/prisma';

export async function getLaborRule(organizationId: string, region = 'DEFAULT') {
  // Try region-specific first, fall back to DEFAULT
  const rule = await prisma.laborRule.findFirst({
    where: { organizationId, region },
  });
  if (rule) return rule;
  return prisma.laborRule.findFirst({ where: { organizationId, region: 'DEFAULT' } });
}

export async function listLaborRules(organizationId: string) {
  return prisma.laborRule.findMany({ where: { organizationId }, orderBy: { region: 'asc' } });
}

export async function createLaborRule(data: {
  organizationId: string;
  region: string;
  maxWeeklyHours: number;
  minStaffPerShift: number;
}) {
  return prisma.laborRule.create({ data });
}

export async function updateLaborRule(
  id: string,
  organizationId: string,
  data: Partial<{ region: string; maxWeeklyHours: number; minStaffPerShift: number }>
) {
  const res = await prisma.laborRule.updateMany({ where: { id, organizationId }, data });
  if (res.count === 0) return null;
  return prisma.laborRule.findUnique({ where: { id } });
}
