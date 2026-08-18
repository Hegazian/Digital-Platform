import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../../../app';

describe('Targeted API Rate Defense (TDD)', () => {
  it('should allow normal requests within rate limit threshold', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'nonexistent@test.com',
      password: 'wrongpassword',
    });

    // Should return 401 Unauthorized from auth service, not 429 Too Many Requests
    expect(res.status).toBe(401);
  });
});
