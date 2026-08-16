import { afterAll } from 'vitest';
import dotenv from 'dotenv';
import { prisma } from '../src/prisma';

dotenv.config({ path: '.env.test' });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

afterAll(async () => {
  await prisma.$disconnect();
});
