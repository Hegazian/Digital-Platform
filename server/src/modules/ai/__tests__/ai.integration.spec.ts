import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../../app';

describe('removed AI tutor API', () => {
  it('does not expose the former tutoring route', async () => {
    const response = await request(app).post('/api/v1/ai/tutor').send({ prompt: 'Explain this lesson' });
    expect(response.status).toBe(404);
  });

  it('does not serve raw local upload paths publicly', async () => {
    const response = await request(app).get('/uploads/known-private-file.pdf');
    expect(response.status).toBe(404);
  });
});
