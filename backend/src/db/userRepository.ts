// User DB module — all Prisma calls relating to users live here.
// Services never import prisma directly; they call these functions.
import { Prisma, Role } from '@prisma/client';
import prisma from '../config/prisma';

// ── Types ──────────────────────────────────────────────────────────────────

export type UserRow = {
  id: string;
  organizationId: string;
  teamId: string | null;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  hasOnboarded: boolean;
  hashedRefreshToken: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Public-safe user shape (never includes passwordHash or hashedRefreshToken)
export type UserPublic = Omit<UserRow, 'passwordHash' | 'hashedRefreshToken'>;

// ── Queries ────────────────────────────────────────────────────────────────

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return prisma.user.findFirst({
    where: { email: email.toLowerCase().trim() },
  });
}

export async function findUserById(
  id: string,
  organizationId: string
): Promise<UserRow | null> {
  return prisma.user.findFirst({
    where: { id, organizationId },
  });
}

export async function findUserByIdUnscoped(id: string): Promise<UserRow | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function listUsers(
  organizationId: string,
  filters: { role?: Role; teamId?: string; page: number; pageSize: number }
): Promise<{ users: UserPublic[]; totalCount: number }> {
  const where: Prisma.UserWhereInput = {
    organizationId,
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.teamId ? { teamId: filters.teamId } : {}),
  };

  const [users, totalCount] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        organizationId: true,
        teamId: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        hasOnboarded: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users: users as UserPublic[], totalCount };
}

export async function createUser(data: {
  organizationId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  teamId?: string;
}): Promise<UserPublic> {
  return prisma.user.create({
    data: {
      ...data,
      email: data.email.toLowerCase().trim(),
    },
    select: {
      id: true,
      organizationId: true,
      teamId: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      hasOnboarded: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateUser(
  id: string,
  organizationId: string,
  data: Partial<{
    name: string;
    role: Role;
    teamId: string | null;
    isActive: boolean;
    hasOnboarded: boolean;
    hashedRefreshToken: string | null;
    passwordHash: string;
  }>
): Promise<UserPublic | null> {
  const result = await prisma.user.updateMany({
    where: { id, organizationId },
    data,
  });

  if (result.count === 0) return null;

  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      teamId: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      hasOnboarded: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// Used only by auth service — needs refresh token hash
export async function updateRefreshToken(
  userId: string,
  hashedRefreshToken: string | null
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { hashedRefreshToken },
  });
}
