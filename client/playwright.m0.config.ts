import { defineConfig, devices } from '@playwright/test';

if (!process.env.M0_FIXTURE_PATH) throw new Error('Use npm run test:m0:browser to create isolated M0 fixtures.');
const development = process.env.M0_WEB_MODE === 'dev';
export default defineConfig({
  testDir: './e2e/m0', fullyParallel: false, forbidOnly: true, retries: 0, workers: 1, timeout: 60_000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/m0', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: { executablePath: process.env.M0_CHROMIUM_EXECUTABLE } },
  webServer: [
    { command: `npm run ${development ? 'dev' : 'start'} -- --hostname 127.0.0.1 --port 3100`, url: 'http://127.0.0.1:3100', reuseExistingServer: false, timeout: 120_000, env: { NODE_ENV: development ? 'development' : 'production' } },
    { command: 'node dist/server.js', cwd: '../server', url: 'http://127.0.0.1:5100', reuseExistingServer: false, timeout: 60_000, env: { NODE_ENV: 'test', PORT: '5100' } },
  ],
  projects: [ { name: 'chromium', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } } ],
});
