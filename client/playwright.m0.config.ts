import { defineConfig, devices } from '@playwright/test';

if (!process.env.M0_FIXTURE_PATH) throw new Error('Use npm run test:m0:browser to create isolated M0 fixtures.');
export default defineConfig({
  testDir: './e2e/m0', fullyParallel: false, forbidOnly: true, retries: 0, workers: 1, timeout: 60_000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/m0', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: { executablePath: process.env.M0_CHROMIUM_EXECUTABLE } },
  projects: [ { name: 'chromium', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } } ],
});
