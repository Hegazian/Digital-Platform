import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import app from '../../../app';

const prisma = new PrismaClient();

const cleanDb = async () => {
  await prisma.section.deleteMany();
  await prisma.course.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.user.deleteMany();
};

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await cleanDb();
  });

  afterEach(async () => {
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a new student', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'test@student.com',
        password: 'Password123!',
        name: 'Test Student',
        role: 'STUDENT',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('test@student.com');
      expect(res.body.data.role).toBe('STUDENT');
    });

    it('should fail when registering an existing email', async () => {
      await request(app).post('/api/v1/auth/register').send({
        email: 'duplicate@test.com',
        password: 'password',
        name: 'First User',
      });

      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'duplicate@test.com',
        password: 'password',
        name: 'Second User',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/exists/i);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login and return tokens for valid credentials', async () => {
      await request(app).post('/api/v1/auth/register').send({
        email: 'login@test.com',
        password: 'ValidPassword123',
        name: 'Login User',
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'login@test.com',
        password: 'ValidPassword123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });

    it('should fail login for wrong password', async () => {
      await request(app).post('/api/v1/auth/register').send({
        email: 'wrongpass@test.com',
        password: 'CorrectPassword',
        name: 'User',
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'wrongpass@test.com',
        password: 'WrongPassword',
      });

      expect(res.status).toBe(401);
    });
  });
});
