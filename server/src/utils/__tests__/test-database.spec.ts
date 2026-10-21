import { describe, expect, it } from 'vitest';
import { assertDedicatedTestDatabase } from '../test-database';

describe('database identity before any test connection', () => {
  const safe = { NODE_ENV: 'test', DATABASE_URL: 'postgresql://test:test@127.0.0.1:5433/eduplatform_test', DIRECT_URL: 'postgresql://test:test@localhost:5433/eduplatform_test' };
  it('accepts the dedicated local database', () => expect(() => assertDedicatedTestDatabase(safe)).not.toThrow());
  it.each([
    { NODE_ENV: 'production' },
    { DATABASE_URL: 'postgresql://test:test@remote.example/eduplatform_test' },
    { DIRECT_URL: 'postgresql://test:test@localhost/production' },
    { DATABASE_URL: 'not-a-url' },
    { DIRECT_URL: '' },
  ])('rejects an unsafe target %o synchronously', (change) => expect(() => assertDedicatedTestDatabase({ ...safe, ...change })).toThrow('Refusing'));
});
