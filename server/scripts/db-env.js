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

console.log(`[db-env] ${envFile} -> ${process.env.DATABASE_URL.replace(/:[^:@/]+@/, ':***@')}`);

const result = spawnSync(
  process.execPath,
  [require.resolve('prisma/build/index.js'), ...process.argv.slice(3)],
  { stdio: 'inherit', env: process.env }
);

process.exit(result.status ?? 1);
