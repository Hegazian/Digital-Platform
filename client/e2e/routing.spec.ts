import { test, expect } from '@playwright/test';

test.describe('App Router & URL Navigation E2E Tests', () => {

  test('should navigate to /courses catalog page', async ({ page }) => {
    await page.goto('/courses');
    await expect(page).toHaveURL(/\/courses/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should handle direct navigation to /login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should handle direct navigation to /register page', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should redirect unauthenticated access to /student/dashboard back to home or login', async ({ page }) => {
    await page.goto('/student/dashboard');
    // Unauthenticated user should not see private dashboard without login
    await expect(page).toHaveURL(/\/(login|\?|$)/);
  });

  test('should allow direct URL navigation to /courses/sample-id', async ({ page }) => {
    await page.goto('/courses/sample-id');
    await expect(page).toHaveURL(/\/courses\/sample-id/);
  });

  test('should reject expired eduplat_rt session and redirect to /?auth=expired or login', async ({ context, page }) => {
    // Generate an expired JWT (exp in the past)
    const expiredPayload = {
      userId: 'test-user-id',
      role: 'ADMIN',
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    };
    const base64Payload = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
    const fakeExpiredJwt = `header.${base64Payload}.signature`;

    await context.addCookies([
      {
        name: 'eduplat_rt',
        value: fakeExpiredJwt,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/admin/dashboard');
    // Should be redirected away from admin dashboard
    await expect(page).not.toHaveURL(/\/admin\/dashboard/);
    await expect(page).toHaveURL(/\/(login|\?.*auth=(expired|required)|$)/);
  });
});
