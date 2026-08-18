import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app';

describe('Auth Module API', () => {
  const getTestUser = () => ({
    name: 'Test Student',
    email: `test-${Date.now()}-${Math.random()}@student.com`,
    password: 'password123',
    role: 'STUDENT',
  });

  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a new student', async () => {
      const testUser = getTestUser();
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email);
    });

    it('should fail if email is already registered', async () => {
      const testUser = getTestUser();
      await request(app).post('/api/v1/auth/register').send(testUser);
      const res = await request(app).post('/api/v1/auth/register').send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/User with this email already exists/i);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const testUser = getTestUser();
      await request(app).post('/api/v1/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens).toHaveProperty('accessToken');
    });

    it('should fail login with wrong password', async () => {
      const testUser = getTestUser();
      await request(app).post('/api/v1/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
