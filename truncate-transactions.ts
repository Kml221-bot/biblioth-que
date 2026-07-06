import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Truncating transactions table to allow schema migration...');
  // Use raw query to avoid schema validation errors with the old schema
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "public"."transactions" CASCADE;');
  console.log('Transactions table truncated successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
