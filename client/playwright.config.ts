import { defineConfig, devices } from '@playwright/test';

if (process.env.LEGACY_E2E_ENABLED !== 'true') throw new Error('Legacy future-feature journeys are not a release gate. Use npm run test:e2e for the isolated M0 browser suite.');

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/m0/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Dev-server E2E is subject to transient blips (next dev recompiles,
  // occasional connection-refused windows). Two retries absorb them;
  // capping parallel workers reduces on-demand compile storms against
  // `next dev`, which cause those windows in the first place.
  retries: 2,
  timeout: 45_000,
  workers: process.env.CI ? 1 : 2,
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      cwd: './',
      // Windows cold starts (next dev compile + API tsx watch) can exceed 60s
      timeout: 180_000,
    },
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:5000/',
      reuseExistingServer: !process.env.CI,
      cwd: '../server',
      timeout: 180_000,
    }
  ],
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
