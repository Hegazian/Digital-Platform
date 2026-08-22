import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../../../app';

describe('Health Check & Request Correlation Engine (TDD)', () => {
  it('should return 200 OK with database connection status and uptime metrics', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(['healthy', 'degraded']).toContain(res.body.status);
    expect(['connected', 'disconnected', 'error']).toContain(res.body.database);
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.memory).toBeDefined();
  });

  it('should attach x-request-id header to incoming and outgoing requests', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['x-request-id']).toBeDefined();
    expect(typeof res.headers['x-request-id']).toBe('string');
  });

  it('should preserve and echo client provided x-request-id header', async () => {
    const customId = 'custom-client-trace-12345';
    const res = await request(app).get('/health').set('x-request-id', customId);

    expect(res.headers['x-request-id']).toBe(customId);
  });
});
