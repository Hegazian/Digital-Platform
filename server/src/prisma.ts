import dotenv from 'dotenv';
import { assertDedicatedTestDatabase } from './utils/test-database';
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test', override: false });
  assertDedicatedTestDatabase();
} else {
  dotenv.config();
}

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
