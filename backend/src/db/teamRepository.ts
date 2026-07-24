// Team DB module — thin Prisma wrapper for Team entity
import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

export type TeamRow = {
  id: string;
  organizationId: string;
  managerId: string;
  name: string;
  region: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TeamWithManager = TeamRow & {
  manager: { id: string; name: string; email: string };
};

export async function listTeams(
  organizationId: string,
  managerId?: string
): Promise<TeamWithManager[]> {
  return prisma.team.findMany({
    where: { organizationId, ...(managerId ? { managerId } : {}) },
    include: { manager: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findTeamById(id: string, organizationId: string): Promise<TeamWithManager | null> {
  return prisma.team.findFirst({
    where: { id, organizationId },
    include: { manager: { select: { id: true, name: true, email: true } } },
  });
}

export async function createTeam(data: {
  organizationId: string;
  managerId: string;
  name: string;
  region?: string;
}): Promise<TeamWithManager> {
  return prisma.team.create({
    data: {
      organizationId: data.organizationId,
      managerId: data.managerId,
      name: data.name,
      region: data.region || 'DEFAULT',
    },
    include: { manager: { select: { id: true, name: true, email: true } } },
  });
}

export async function updateTeam(
  id: string,
  organizationId: string,
  data: Partial<{ name: string; managerId: string; region: string }>
): Promise<TeamWithManager | null> {
  const res = await prisma.team.updateMany({ where: { id, organizationId }, data });
  if (res.count === 0) return null;
  return findTeamById(id, organizationId);
}

export async function getTeamMembers(teamId: string, organizationId: string) {
  return prisma.user.findMany({
    where: { teamId, organizationId, isActive: true },
    select: {
      id: true, name: true, email: true, role: true,
      isActive: true, hasOnboarded: true, teamId: true,
    },
    orderBy: { name: 'asc' },
  });
}
