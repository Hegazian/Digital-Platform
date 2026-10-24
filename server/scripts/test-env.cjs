// Select the explicitly dedicated local fixture database, never the default .env.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const testFile = path.join(root, '.env.test');
const fixtureEnv = fs.existsSync(testFile) ? require('dotenv').parse(fs.readFileSync(testFile)) : {};
const env = { ...process.env, ...fixtureEnv, NODE_ENV: 'test' };
env.MFA_ENCRYPTION_KEY ||= '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
if (process.argv.includes('--release-coverage')) env.COVERAGE_RELEASE = 'true';
for (const name of ['DATABASE_URL', 'DIRECT_URL']) {
  let url;
  try { url = new URL(env[name]); } catch { throw new Error(`Missing or invalid ${name} for tests`); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname) || url.pathname !== '/eduplatform_test') throw new Error(`Refusing unsafe ${name} for tests`);
}
const vitest = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
const result = spawnSync(process.execPath, [vitest, 'run', '--no-file-parallelism', ...process.argv.slice(2).filter((arg) => arg !== '--release-coverage')], { cwd: root, env, stdio: 'inherit' });
process.exit(result.status ?? 1);
