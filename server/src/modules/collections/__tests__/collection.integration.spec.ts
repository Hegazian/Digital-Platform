import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import bcrypt from 'bcrypt';

describe('Curated Collections API (TDD)', () => {
  let adminToken: string;
  let adminId: string;
  let collectionId: string;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const admin = await prisma.user.create({
      data: {
        email: `admin_coll_${Date.now()}@eduplatform.com`,
        password: hashedPassword,
        name: 'Collection Admin',
        role: 'ADMIN',
      },
    });
    adminId = admin.id;

    adminToken = generateAccessToken({
      userId: admin.id,
      role: 'ADMIN',
      teacherStatus: null,
    });
  });

  afterAll(async () => {
    try {
      await prisma.collectionCourse.deleteMany();
      await prisma.collection.deleteMany();
      await prisma.user.deleteMany({ where: { email: { contains: 'admin_coll_' } } });
    } catch (e) {}
  });

  it('POST /api/v1/collections - should create a curated course collection', async () => {
    const res = await request(app)
      .post('/api/v1/collections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        titleEn: 'Egyptian General Secondary Mastery Track',
        titleAr: 'مسار إتقان الثانوية العامة المصرية',
        slug: `sec-mastery-${Date.now()}`,
        description: 'Complete physics, math, and programming curriculum bundle.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    collectionId = res.body.data.id;
  });

  it('GET /api/v1/collections - should list published collections', async () => {
    const res = await request(app)
      .get('/api/v1/collections');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
