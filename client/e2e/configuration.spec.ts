import { test, expect } from '@playwright/test';

/**
 * Config-driven UI scenarios (regression lock for the hardcoded-brand era).
 *
 * PREVIOUS STATE: "EduPlatform" was baked into the navbar/footer/tab title,
 * no slogan existed, primaryColor/allowTeacherRegistration were dead knobs.
 */

const API = 'http://127.0.0.1:5000/api/v1';

async function adminToken(): Promise<string | null> {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) return null;
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  return (await res.json()).data.tokens.accessToken;
}

test.describe('Configurable branding', () => {
  let token: string | null;

  test.beforeAll(async () => {
    token = await adminToken();
  });

  test.afterAll(async () => {
    // Restore defaults so other suites see stock branding
    if (!token) return;
    await fetch(`${API}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        siteNameEn: 'EduPlatform',
        siteNameAr: 'منصة التعليم',
        sloganEn: '',
        sloganAr: '',
        primaryColor: '#4f46e5',
      }),
    }).catch(() => undefined);
  });

  test('default brand renders before any customization', async ({ page }) => {
    await page.goto('/');
    // Navbar brand falls back to configured/default name
    await expect(page.locator('header').getByText(/EduPlatform|إديوبلاتفورم|منصة التعليم/i)).toBeVisible();
  });

  test('admin updates name+slogan+color -> home reflects them after reload', async ({ page }) => {
    test.skip(!token, 'Admin credentials not configured (set E2E_ADMIN_EMAIL/PASSWORD)');

    const put = await fetch(`${API}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        siteNameEn: 'Mawsoaa Academy',
        sloganEn: 'Where future engineers are built',
        primaryColor: '#7c3aed',
        supportEmail: 'brand@mawsoaa.com',
        hostDomain: 'mawsoaa.com',
        currency: 'EGP',
        requireCourseApproval: true,
      }),
    });
    expect(put.ok).toBeTruthy();

    // Hard reload: bootstrap must re-apply config
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.locator('header').getByText('Mawsoaa Academy')).toBeVisible();
    await expect(page.getByText('Where future engineers are built').first()).toBeVisible();
    await expect(page).toHaveTitle(/Mawsoaa Academy/);

    // theme-color meta follows primaryColor
    const theme = await page.evaluate(() =>
      document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content
    );
    expect(theme?.toLowerCase()).toBe('#7c3aed');
  });

  test('allowTeacherRegistration=false hides the Teacher signup option', async ({ page }) => {
    test.skip(!token, 'Admin credentials not configured');

    const patch = await fetch(`${API}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ allowTeacherRegistration: false }),
    });
    expect(patch.ok).toBeTruthy();

    await page.goto('/login');
    await page.click('#login-btn');
    await page.click('text=Sign Up');
    await page.waitForTimeout(300); // allow config bootstrap to land

    await expect(page.getByText('STUDENT')).toBeVisible();
    await expect(page.getByText('TEACHER')).toHaveCount(0);
    await expect(page.getByText(/Teacher registration is currently closed/i)).toBeVisible();
  });

  test('re-enabling teacher registration restores the option', async ({ page }) => {
    test.skip(!token, 'Admin credentials not configured');
    await page.goto('/');
    const restore = await fetch(`${API}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ allowTeacherRegistration: true }),
    });
    expect(restore.ok).toBeTruthy();

    await page.goto('/login');
    await page.click('#login-btn');
    await page.click('text=Sign Up');
    await expect(page.getByText('TEACHER')).toBeVisible();
  });
});
