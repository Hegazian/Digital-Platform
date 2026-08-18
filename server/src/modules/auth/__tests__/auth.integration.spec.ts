import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../../prisma';
import app from '../../../app';

describe('Auth Integration Tests', () => {
  const testPrefix = `auth-test-${Date.now()}`;
  const studentEmail = `${testPrefix}-student@test.com`;
  const dupEmail = `${testPrefix}-dup@test.com`;
  const loginEmail = `${testPrefix}-login@test.com`;
  const wrongPassEmail = `${testPrefix}-wrongpass@test.com`;

  const cleanDb = async () => {
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [studentEmail, dupEmail, loginEmail, wrongPassEmail],
          },
        },
      });
    } catch (e) {}
  };

  beforeAll(async () => {
    await cleanDb();
  }, 15000);

  afterAll(async () => {
    await cleanDb();
  }, 15000);

  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a new student', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: studentEmail,
        password: 'Password123!',
        name: 'Test Student',
        role: 'STUDENT',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(studentEmail);
      expect(res.body.data.role).toBe('STUDENT');
    });

    it('should fail when registering an existing email', async () => {
      await request(app).post('/api/v1/auth/register').send({
        email: dupEmail,
        password: 'password',
        name: 'First User',
      });

      const res = await request(app).post('/api/v1/auth/register').send({
        email: dupEmail,
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
        email: loginEmail,
        password: 'ValidPassword123',
        name: 'Login User',
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: loginEmail,
        password: 'ValidPassword123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });

    it('should fail login for wrong password', async () => {
      await request(app).post('/api/v1/auth/register').send({
        email: wrongPassEmail,
        password: 'CorrectPassword',
        name: 'User',
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: wrongPassEmail,
        password: 'WrongPassword',
      });

      expect(res.status).toBe(401);
    });
  });
});
