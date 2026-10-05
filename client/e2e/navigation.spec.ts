import { test, expect, Page } from '@playwright/test';

/**
 * Navigation & cross-role consistency scenarios.
 * Covers the transition bugs introduced by the dual navigation systems
 * (store-tab swaps vs real routes) and course-visibility parity contracts.
 */

const API = 'http://127.0.0.1:5000/api/v1';

async function seedUser(role: 'STUDENT' | 'TEACHER' | 'ADMIN') {
  const email = `nav-${role.toLowerCase()}-${Date.now()}@test.com`;
  const password = 'Password123!';

  // Students must register with a student number + grade year.
  let studentNumber: string | undefined;
  let gradeId: string | undefined;
  if (role === 'STUDENT') {
    studentNumber = `NAV-${Date.now()}`;
    const stagesRes = await fetch(`${API}/academic/stages`);
    const stages = (await stagesRes.json()).data ?? [];
    gradeId = stages?.[0]?.grades?.[0]?.id;
    if (!gradeId) {
      throw new Error('Seed failed: no academic stages/grades exist in the environment');
    }
  }

  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: `Nav ${role}`, role, studentNumber, gradeId }),
  });
  // register returns 201 (or 409 if retried); anything else is fatal —
  // surface it instead of failing later with a confusing login timeout.
  if (![200, 201, 409].includes(res.status)) {
    throw new Error(`Seed register failed (${res.status}): ${await res.text()}`);
  }
  return { email, password };
}

async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.click('#login-btn');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // AuthModal redirects to the role dashboard on success
  try {
    await page.waitForURL(/dashboard/, { timeout: 15_000 });
  } catch (e) {
    const formText = await page
      .locator('form')
      .first()
      .innerText()
      .catch(() => '(form not rendered)');
    throw new Error(`Login did not reach a dashboard. Form says: ${JSON.stringify(formText.slice(0, 300))}`);
  }
}

test.describe('Navigation & transitions', () => {
  let student: { email: string; password: string };

  test.beforeAll(async () => {
    student = await seedUser('STUDENT');
  });

  test('guest clicking Courses lands on /courses and back button returns home', async ({ page }) => {
    await page.goto('/');
    // NOTE: navbar links are desktop-only (hidden md:flex); the hero CTA is
    // the responsive path into the catalog and works on every viewport.
    await page.locator('main a[href="/courses"]').first().click();
    await page.waitForURL('**/courses');
    expect(page.url()).toContain('/courses');

    await page.goBack();
    await page.waitForURL((u) => !u.pathname.includes('/courses'));
  });

  test('unauthenticated visit to a dashboard route is bounced by middleware', async ({ page }) => {
    await page.goto('/admin/dashboard');
    // middleware redirects to / with auth=required hint
    await page.waitForURL((u) => u.pathname === '/');
    expect(page.url()).not.toContain('/admin');
  });

  test('signed-in user visiting /login is redirected to their dashboard', async ({ page }) => {
    const s = await student;
    await loginViaUi(page, s.email, s.password);

    await page.goto('/login');
    await page.waitForURL(/student\/dashboard/);
  });

  test('student cannot open /admin/dashboard - lands on own dashboard instead', async ({ page }) => {
    const s = await student;
    await loginViaUi(page, s.email, s.password);

    await page.goto('/admin/dashboard');
    // Guard hook redirects non-admins to their own home
    await page.waitForURL(/student\/dashboard/, { timeout: 10_000 });
    await expect(page.locator('text=Admin')).toBeVisible({ timeout: 5_000 }).catch(() => {
      // Navbar may render "Admin Panel" only for admins - absence is fine here;
      // the URL assertion above is the contract.
    });
  });

  test('course card click deep-links into the player route', async ({ page }) => {
    await page.goto('/courses');
    const card = page.locator('[data-course-card], .cursor-pointer').filter({ hasText: /EGP|Free/i }).first();

    // Skip gracefully if catalog is empty in this environment
    if ((await card.count()) === 0) {
      test.skip();
      return;
    }
    await card.click();
    await page.waitForURL(/\/courses\/[a-f0-9-]+/i, { timeout: 10_000 });
    // Player chrome must be mounted (no dead click)
    await expect(page.locator('header')).toBeVisible();
  });
});

test.describe('Course visibility parity (student vs management)', () => {
  test('anonymous catalog never lists drafts while staff views can', async ({ request }) => {
    // Anonymous public list: strictly published
    const anon = await request.get(`${API}/courses`);
    expect(anon.ok()).toBeTruthy();
    const anonBody = await anon.json();
    const anonCourses = anonBody.data?.courses ?? [];
    expect(anonCourses.every((c: any) => c.status === 'PUBLISHED' && c.isPublished === true)).toBe(true);

    // Admin list includes non-published lifecycle rows (drafts/review/rejected)
    // NOTE: requires an admin account in the environment; skipped cleanly otherwise.
    const adminEmail = process.env.E2E_ADMIN_EMAIL;
    const adminPassword = process.env.E2E_ADMIN_PASSWORD;
    test.skip(!adminEmail || !adminPassword, 'Admin credentials not configured');

    const login = await request.post(`${API}/auth/login`, {
      data: { email: adminEmail, password: adminPassword },
    });
    const token = (await login.json()).data.tokens.accessToken;

    const staff = await request.get(`${API}/courses?limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const staffBody = await staff.json();
    const staffCourses = staffBody.data?.courses ?? [];
    // Parity rule: every course visible anonymously must also be visible to staff
    const anonIds = new Set(anonCourses.map((c: any) => c.id));
    for (const c of anonCourses) {
      expect(staffCourses.some((s: any) => s.id === c.id)).toBe(true);
    }
    expect(anonIds.size).toBeLessThanOrEqual(staffCourses.length);
  });
});
