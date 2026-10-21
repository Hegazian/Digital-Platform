/**
 * Runs the Prisma CLI with a specific env file loaded first, e.g.:
 *
 *   node scripts/db-env.js .env.test db push
 *   node scripts/db-env.js .env.test db push --force-reset
 *   node scripts/db-env.js .env.test studio
 *
 * Values from the env file override anything already in the environment
 * (override: true), and take precedence over the default .env because the
 * Prisma CLI never overrides existing process.env values.
 */
const path = require('path');
const { spawnSync } = require('child_process');

const envFile = process.argv[2];
if (!envFile) {
  console.error('Usage: node scripts/db-env.js <env-file> <prisma args...>');
  process.exit(1);
}

require('dotenv').config({ path: path.resolve(__dirname, '..', envFile), override: true });

const isTestUrl = (raw) => {
  try { const url = new URL(raw); return ['postgres:', 'postgresql:'].includes(url.protocol) && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname) && url.pathname === '/eduplatform_test'; }
  catch { return false; }
};
const isDedicatedTestTarget = isTestUrl(process.env.DATABASE_URL) && isTestUrl(process.env.DIRECT_URL);
if (envFile === '.env.test' && !isDedicatedTestTarget) {
  console.error('Refusing test database command: .env.test must target localhost/eduplatform_test.');
  process.exit(2);
}
if (process.argv.includes('--force-reset') && !isDedicatedTestTarget) {
  console.error('Refusing destructive Prisma reset: only localhost/eduplatform_test is allowlisted.');
  process.exit(2);
}

console.log(`[db-env] ${envFile} -> ${process.env.DATABASE_URL.replace(/:[^:@/]+@/, ':***@')}`);

const result = spawnSync(
  process.execPath,
  [require.resolve('prisma/build/index.js'), ...process.argv.slice(3)],
  { stdio: 'inherit', env: process.env }
);

process.exit(result.status ?? 1);
