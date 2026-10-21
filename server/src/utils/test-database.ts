export function assertDedicatedTestDatabase(environment: NodeJS.ProcessEnv = process.env): void {
  const allowed = (raw: string | undefined) => {
    if (!raw) return false;
    try {
      const url = new URL(raw);
      return ['postgres:', 'postgresql:'].includes(url.protocol) && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname) && url.pathname === '/eduplatform_test';
    } catch { return false; }
  };
  if (environment.NODE_ENV !== 'test' || !allowed(environment.DATABASE_URL) || !allowed(environment.DIRECT_URL)) {
    throw new Error('Refusing test database access: NODE_ENV=test and both database URLs must target localhost/eduplatform_test.');
  }
}
