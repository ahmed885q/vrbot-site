const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
