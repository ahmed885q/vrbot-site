import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@vrbot.me';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMeNow123!';

  // Roles
  for (const name of ['admin', 'deploy', 'user']) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });

  // Admin user
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  const adminUser = existing ?? await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: await argon2.hash(adminPassword),
    },
  });

  // Attach admin role
  if (adminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
      update: {},
      create: { userId: adminUser.id, roleId: adminRole.id },
    });
  }

  // Plans
  const plans = [
    { code: 'free', name: 'Free', priceCents: 0, currency: 'USD', limitsJson: { bots: 1, jobsPerDay: 50 } },
    { code: 'pro', name: 'Pro', priceCents: 1999, currency: 'USD', limitsJson: { bots: 5, jobsPerDay: 500 } },
  ];
  for (const p of plans) {
    await prisma.plan.upsert({ where: { code: p.code }, update: p as any, create: p as any });
  }

  console.log('Seed done:', { adminEmail });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
