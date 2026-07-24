// Seed script — inserts a demo Organization + ADMIN user + default LaborRule
// Run with: npm run db:seed --workspace=backend
// Credentials: admin@shiftsync.demo / Admin@123!

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ShiftSync demo data...\n');

  // ── 1. Organization ────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { id: 'org-demo-001' },
    update: {},
    create: {
      id: 'org-demo-001',
      name: 'Acme Corp',
    },
  });
  console.log(`✅ Organization: ${org.name} (${org.id})`);

  // ── 2. Admin User ──────────────────────────────────────────────────────────
  const adminPasswordHash = await bcrypt.hash('Admin@123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@shiftsync.demo' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Alex Admin',
      email: 'admin@shiftsync.demo',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isActive: true,
      hasOnboarded: false,
    },
  });
  console.log(`✅ ADMIN user: ${admin.email} / Admin@123!`);

  // ── 3. Default Labor Rule ──────────────────────────────────────────────────
  const laborRule = await prisma.laborRule.upsert({
    where: { organizationId_region: { organizationId: org.id, region: 'DEFAULT' } },
    update: {},
    create: {
      organizationId: org.id,
      region: 'DEFAULT',
      maxWeeklyHours: 48,
      minStaffPerShift: 1,
    },
  });
  console.log(`✅ Default LaborRule: max ${laborRule.maxWeeklyHours}h/week, min ${laborRule.minStaffPerShift} staff/shift`);

  console.log('\n🎉 Seed complete!');
  console.log('───────────────────────────────────────');
  console.log('  Organization: Acme Corp');
  console.log('  Admin login:  admin@shiftsync.demo');
  console.log('  Password:     Admin@123!');
  console.log('───────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
