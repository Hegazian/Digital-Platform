import { vi, beforeAll, afterAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';
import { prisma } from '../src/prisma';

dotenv.config({ path: '.env.test' }); // Should use test DB

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

beforeAll(async () => {
  // Clear the database tables before each test
  await prisma.$transaction([
    prisma.lessonProgress.deleteMany(),
    prisma.quizAttempt.deleteMany(),
    prisma.material.deleteMany(),
    prisma.video.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.section.deleteMany(),
    prisma.course.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.subjectPricing.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.parentStudent.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});
