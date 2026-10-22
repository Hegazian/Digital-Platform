import request from 'supertest';
import { afterEach, describe, it, expect, vi } from 'vitest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { StorageService } from '../../../utils/storage';
import { setReadinessDraining } from '../health.service';

afterEach(() => { setReadinessDraining(false); vi.restoreAllMocks(); });

describe('Health Check & Request Correlation Engine (TDD)', () => {
  it('separates process liveness from database and storage readiness', async () => {
    vi.spyOn(prisma, '$queryRawUnsafe').mockResolvedValue([{ '?column?': 1 }] as never);
    vi.spyOn(StorageService, 'checkAvailability').mockResolvedValue();
    const live = await request(app).get('/health/live');
    const ready = await request(app).get('/health/ready');

    expect(live.status).toBe(200);
    expect(live.body).toEqual({ status: 'LIVE' });
    expect(ready.status).toBe(200);
    expect(ready.body).toEqual({ status: 'READY', draining: false, dependencies: { database: 'ready', storage: 'ready' } });
  });

  it('returns 503 readiness when the database is unavailable while liveness remains live', async () => {
    vi.spyOn(prisma, '$queryRawUnsafe').mockRejectedValue(new Error('private database detail'));
    vi.spyOn(StorageService, 'checkAvailability').mockResolvedValue();
    const ready = await request(app).get('/health/ready');
    const live = await request(app).get('/health/live');

    expect(ready.status).toBe(503);
    expect(ready.body).toEqual({ status: 'NOT_READY', draining: false, dependencies: { database: 'unavailable', storage: 'ready' } });
    expect(JSON.stringify(ready.body)).not.toContain('private database detail');
    expect(live.status).toBe(200);
  });

  it('returns 503 readiness when the selected storage backend is unavailable', async () => {
    vi.spyOn(prisma, '$queryRawUnsafe').mockResolvedValue([{ '?column?': 1 }] as never);
    vi.spyOn(StorageService, 'checkAvailability').mockRejectedValue(new Error('private storage detail'));
    const ready = await request(app).get('/health/ready');
    expect(ready.status).toBe(503);
    expect(ready.body.dependencies).toEqual({ database: 'ready', storage: 'unavailable' });
    expect(JSON.stringify(ready.body)).not.toContain('private storage detail');
  });

  it('marks readiness down before graceful shutdown drains existing requests', async () => {
    setReadinessDraining(true);
    vi.spyOn(prisma, '$queryRawUnsafe').mockResolvedValue([{ '?column?': 1 }] as never);
    vi.spyOn(StorageService, 'checkAvailability').mockResolvedValue();
    const ready = await request(app).get('/health/ready');
    expect(ready.status).toBe(503);
    expect(ready.body).toEqual({ status: 'NOT_READY', draining: true, dependencies: { database: 'ready', storage: 'ready' } });
  });

  it('should attach x-request-id header to incoming and outgoing requests', async () => {
    const res = await request(app).get('/health/live');

    expect(res.headers['x-request-id']).toBeDefined();
    expect(typeof res.headers['x-request-id']).toBe('string');
  });

  it('should preserve and echo client provided x-request-id header', async () => {
    const customId = 'custom-client-trace-12345';
    const res = await request(app).get('/health/live').set('x-request-id', customId);

    expect(res.headers['x-request-id']).toBe(customId);
  });
});
