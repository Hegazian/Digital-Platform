import { devices, test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

const fixture = JSON.parse(fs.readFileSync(process.env.M0_FIXTURE_PATH!, 'utf8'));
function monitor(page: Page) {
  const errors: string[] = [];
  const failedApi: string[] = [];
  const pending = new Set<string>();
  const developer: string[] = [];
  const requestFailures: Array<{ url: string; reason: string }> = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    // Chromium logs these without the failed URL; requestfailed below records
    // the resource and reason so an intentional cancellation can be asserted.
    if (message.text().startsWith('Failed to load resource:')) return;
    if (['error', 'warning'].includes(message.type())) errors.push(message.text());
  });
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) pending.add(request.url());
    if (request.url().includes('/developer/')) developer.push(request.url());
  });
  page.on('response', (response) => {
    if (response.url().includes('/api/v1/') && response.status() >= 400) failedApi.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  page.on('requestfinished', (request) => pending.delete(request.url()));
  page.on('requestfailed', (request) => {
    pending.delete(request.url());
    const reason = request.failure()?.errorText || 'unknown';
    // Next dev cancels superseded React Server Component navigation requests
    // during Strict Mode refreshes; they do not represent failed app data.
    if (reason === 'net::ERR_ABORTED' && new URL(request.url()).searchParams.has('_rsc')) return;
    requestFailures.push({ url: request.url(), reason });
  });
  return { errors, failedApi, developer, requestFailures, settle: () => expect.poll(() => pending.size, { timeout: 15_000 }).toBe(0) };
}
async function login(page: Page, name: string, role: string) {
  await page.goto('/login');
  await page.locator('#auth-email-input').fill(fixture.users[name].email);
  await page.locator('#auth-password-input').fill(fixture.password);
  const authenticated = page.waitForResponse((response) => response.url().endsWith('/auth/login') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  expect((await authenticated).status()).toBe(200);
  // next dev compiles a role's dashboard on its first navigation.
  await expect(page).toHaveURL(new RegExp(`/${role}/dashboard`), { timeout: process.env.M0_WEB_MODE === 'dev' ? 30_000 : 10_000 });
  if (role === 'student') {
    await expect(page.getByRole('dialog', { name: 'Choose your target faculty' })).toBeVisible();
    await page.keyboard.press('Escape');
  }
}

test('admin dashboard tabs and staged developer controls have no unexpected API or browser failures', async ({ page }) => {
  const observed = monitor(page);
  await login(page, 'admin', 'admin');
  await expect(page.getByRole('heading', { name: 'Platform Control Center' })).toBeVisible();
  const tabs = [
    [/Academic Structure/, 'Academic Structure Management'],
    [/Course Management/, 'Course Governance & Management Center'],
    [/Collections/, 'Curated Collections'],
    [/Course Orders/, 'Course Purchase Orders'],
    [/Promo Codes/, 'Promo Codes & Vouchers'],
    [/Teacher Approvals/, 'Pending Educator Verifications'],
    [/Platform & Domain/, 'Platform & Domain Configuration'],
    [/API & Webhooks/, 'Developer integrations are not available yet'],
    [/Audit Logs/, 'System Audit Trails'],
  ] as const;
  for (const [tab, heading] of tabs) {
    await page.getByRole('button', { name: tab }).click();
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await observed.settle();
  }
  await page.getByRole('button', { name: /Offline Payments/ }).click();
  await expect(page.getByRole('heading', { name: 'No Pending Offline Payments', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'User Directory', exact: true }).click();
  await page.getByPlaceholder('Search accounts by name or email...').fill(fixture.users.admin.email);
  await expect(page.getByText(fixture.users.admin.email, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /API & Webhooks/ }).click();
  await page.locator('#lang-toggle-btn').click();
  await expect(page.getByRole('status')).toContainText('غير متاحة');
  await observed.settle();
  expect(observed.developer).toEqual([]);
  expect(observed.failedApi).toEqual([]);
  expect(observed.requestFailures).toEqual([]);
  expect(observed.errors).toEqual([]);
});

test('admin inspection loads the actual curriculum from metadata-only course lists', async ({ page }) => {
  const observed = monitor(page);
  await login(page, 'admin', 'admin');
  await page.getByRole('button', { name: /Course Management/ }).click();
  await expect(page.getByRole('heading', { name: /M0 course en/ })).toBeVisible();
  const card = page.getByRole('heading', { name: /M0 course en/ }).locator('..').locator('..').locator('..');
  await card.getByRole('button', { name: 'Inspect', exact: true }).click();
  await expect(page.getByText('1. M0 lesson en', { exact: true })).toBeVisible();
  expect(observed.errors).toEqual([]);
});

for (const locale of ['en', 'ar'] as const) {
  test(`admin config saves EGP rate and rejects a stale ${locale} edit`, async ({ browser, page, request }, info) => {
    const baseURL = 'http://127.0.0.1:3100';
    const currentPage = page;
    const staleContext = await browser.newContext({
      baseURL,
      ...devices[info.project.name === 'mobile-chrome' ? 'Pixel 5' : 'Desktop Chrome'],
    });
    const stalePage = await staleContext.newPage();
    let originalRate: number | undefined;

    async function openSettings(target: Page) {
      await target.getByRole('button', { name: /Platform & Domain/ }).click();
      await expect(target.getByRole('heading', { name: 'Platform & Domain Configuration' })).toBeVisible();
      const rate = target.locator('#exchange-rate-usd-to-egp');
      await expect(rate).toBeVisible();
      return rate;
    }

    async function restoreRate() {
      if (originalRate === undefined) return;
      const token = await currentPage.evaluate(() => localStorage.getItem('accessToken'));
      if (!token) throw new Error('Admin session token missing during config fixture cleanup.');
      const headers = { Authorization: `Bearer ${token}` };
      const latest = await request.get('/api/v1/config', { headers });
      if (!latest.ok()) throw new Error(`Unable to read config for fixture cleanup (${latest.status()}).`);
      const latestConfig = (await latest.json()).data;
      if (Number(latestConfig.exchangeRateUsdToEgp) === originalRate) return;
      const restored = await request.patch('/api/v1/config', {
        headers,
        data: { expectedVersion: latestConfig.version, exchangeRateUsdToEgp: originalRate },
      });
      if (!restored.ok()) throw new Error(`Unable to restore config fixture rate (${restored.status()}).`);
    }

    try {
      await login(currentPage, 'admin', 'admin');
      const currentRateInput = await openSettings(currentPage);
      originalRate = Number(await currentRateInput.inputValue());

      await login(stalePage, 'admin', 'admin');
      const staleRateInput = await openSettings(stalePage);
      expect(Number(await staleRateInput.inputValue())).toBe(originalRate);

      if (locale === 'ar') await stalePage.locator('#lang-toggle-btn').click();
      await expect(stalePage.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(stalePage.getByLabel(locale === 'ar'
        ? 'سعر الصرف الإرشادي — ١ دولار أمريكي = ؟ جنيه مصري'
        : 'Indicative display rate — 1 USD = ? EGP')).toBeVisible();

      const newRate = originalRate < 999_999 ? originalRate + 1 : originalRate - 1;
      await currentRateInput.fill(String(newRate));
      const currentSave = currentPage.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/config') && response.request().method() === 'PUT');
      await currentPage.getByRole('button', { name: 'Save Platform Settings', exact: true }).click();
      const saved = await currentSave;
      expect(saved.status()).toBe(200);
      expect(Number((await saved.json()).data.exchangeRateUsdToEgp)).toBe(newRate);
      await expect(currentPage.getByText('Platform configuration and home page content saved successfully!', { exact: true })).toBeVisible();

      await staleRateInput.fill(String(newRate + 1));
      const staleSave = stalePage.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/config') && response.request().method() === 'PUT');
      await stalePage.getByRole('button', { name: locale === 'ar' ? 'حفظ إعدادات المنصة' : 'Save Platform Settings', exact: true }).click();
      const conflict = await staleSave;
      expect(conflict.status()).toBe(409);
      expect((await conflict.json()).code).toBe('CONFIG_VERSION_CONFLICT');
      await expect(stalePage.getByText(locale === 'ar'
        ? 'تم تغيير الإعدادات في جلسة أخرى. أعد تحميل الإعدادات ثم حاول مرة أخرى.'
        : 'Settings changed in another session. Reload the settings and try again.', { exact: true })).toBeVisible();

      const currentConfig = await request.get('/api/v1/config', {
        headers: { Authorization: `Bearer ${await currentPage.evaluate(() => localStorage.getItem('accessToken'))}` },
      });
      expect(Number((await currentConfig.json()).data.exchangeRateUsdToEgp)).toBe(newRate);
    } finally {
      try {
        await restoreRate();
      } finally {
        await staleContext.close();
      }
    }
  });
}

test('teacher workspace tabs and developer notice have no unexpected API/browser errors', async ({ page }) => {
  const observed = monitor(page);
  await login(page, 'teacher', 'teacher');
  await expect(page.getByRole('heading', { name: 'Curriculum & Resource Studio' })).toBeVisible();
  for (const [tab, heading] of [
    ['Live Zoom Classes', 'Live Zoom Sessions'],
    ['Exam Builder', 'Question Pools'],
    ['Podcasts', 'Create a Show'],
    ['Announcements', 'Student Announcements'],
    ['Grading Center', 'Assignment Studio'],
    ['Analytics & Students', 'Teacher Analytics & Student Progress'],
  ]) {
    await page.getByRole('button', { name: tab === 'Podcasts' ? 'Podcast Studio' : tab, exact: true }).click();
    if (heading) await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await observed.settle();
  }
  await page.getByRole('button', { name: 'API & Docs', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('not available yet');
  await observed.settle();
  expect(observed.developer).toEqual([]);
  expect(observed.failedApi).toEqual([]);
  expect(observed.requestFailures).toEqual([]);
  expect(observed.errors).toEqual([]);
});

test('profile recovers an expired access token, persists edits and reloads', async ({ page }, info) => {
  await login(page, info.project.name, 'student');
  await page.evaluate(() => localStorage.setItem('accessToken', 'expired-access-token'));
  const refreshed = page.waitForResponse((response) => response.url().endsWith('/auth/refresh'));
  await page.goto('/profile');
  expect((await refreshed).status()).toBe(200);
  await expect(page.locator('#profile-email')).toHaveValue(fixture.users[info.project.name].email);
  await page.locator('#profile-name').fill(`Reviewed ${info.project.name}`);
  await page.getByRole('button', { name: /Save/ }).click();
  await expect(page.getByText('Profile updated successfully')).toBeVisible();
  await page.reload();
  await expect(page.locator('#profile-name')).toHaveValue(`Reviewed ${info.project.name}`);
});

test('malformed and expired refresh-cookie hints reach login without a redirect loop', async ({ page, context }) => {
  for (const value of ['invalid-cookie', `e30.${Buffer.from(JSON.stringify({ role: 'STUDENT', exp: 1 })).toString('base64url')}.signature`]) {
    await context.addCookies([{ name: 'eduplat_rt', value, url: 'http://127.0.0.1:3100' }]);
    await page.goto('/student/dashboard');
    await expect(page).toHaveURL(/\/login\?auth=required$/);
    await expect(page.locator('#auth-email-input')).toBeVisible();
  }
});

test('student cannot open admin or teacher dashboards, and logout removes the protected session', async ({ page }, info) => {
  await login(page, info.project.name, 'student');
  for (const target of ['/admin/dashboard', '/teacher/dashboard']) {
    await page.goto(target);
    await expect(page).toHaveURL(/\/student\/dashboard$/);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  const loggedOut = page.waitForResponse((response) => response.url().endsWith('/auth/logout') && response.request().method() === 'POST');
  await page.getByRole('button', { name: /Logout|Sign Out|Log Out|تسجيل الخروج/i }).click();
  expect((await loggedOut).ok()).toBe(true);
  await expect(page).toHaveURL((url) => url.pathname === '/login');
  await expect(page.locator('#auth-email-input')).toBeVisible();
  expect((await page.context().cookies()).some((cookie) => cookie.name === 'eduplat_rt')).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBeNull();
  await page.goto('/student/dashboard');
  await expect(page).toHaveURL((url) => url.pathname === '/login');
  await expect(page.locator('#auth-email-input')).toBeVisible();
});

test('changing a document cancels the old request without warnings or stale content', async ({ page }, info) => {
  const observed = monitor(page);
  // Keep first-enrollment fixtures for safety.spec.ts untouched.
  await login(page, `outsider-${info.project.name}`, 'student');
  const course = fixture.courses.en;
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let started!: () => void;
  const intercepted = new Promise<void>((resolve) => { started = resolve; });
  await page.route(`**/materials/${course.materialId}/content`, async (route) => {
    started();
    await held;
    await route.continue().catch(() => {});
  });
  const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
  const enrolled = await page.request.post(`/api/v1/courses/${course.id}/enroll`, { headers: { Authorization: `Bearer ${accessToken}` } });
  expect(enrolled.ok()).toBe(true);
  await page.goto(`/courses/${course.id}`);
  await expect(page.getByRole('button', { name: /M0 lesson en/ })).toBeVisible();
  await page.getByRole('button', { name: /PDF Materials/ }).click();
  await intercepted;
  await page.getByRole('button', { name: 'M0 second PDF', exact: true }).click();
  await expect(page.getByTitle('M0 second PDF')).toHaveAttribute('src', /^blob:/);
  release();
  await page.unroute(`**/materials/${course.materialId}/content`);
  await expect(page.getByTitle('M0 second PDF')).toBeVisible();
  await observed.settle();
  await expect.poll(() => observed.requestFailures.some(({ url }) => url.includes(`/materials/${course.materialId}/content`))).toBe(true);
  expect(observed.requestFailures).toEqual(expect.arrayContaining([
    expect.objectContaining({ url: expect.stringContaining(`/materials/${course.materialId}/content`), reason: 'net::ERR_ABORTED' }),
    expect.objectContaining({ url: expect.stringMatching(/^blob:/), reason: 'net::ERR_ABORTED' }),
  ]));
  expect(observed.requestFailures.every(({ reason }) => reason === 'net::ERR_ABORTED')).toBe(true);
  expect(observed.errors).toEqual([]);
});
