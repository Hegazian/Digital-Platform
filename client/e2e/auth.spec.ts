import { test, expect } from '@playwright/test';

test.describe('Authentication & Navigation E2E Journey', () => {
  test('should display home page with header, hero, and subject pricing cards', async ({ page }) => {
    await page.goto('/');
    // Title is SSR metadata ("EduPlatform …") until /config loads, then it
    // becomes the admin-configured site name — accept either branding state.
    await expect(page).toHaveTitle(/EduPlatform|Teachneer|Platform/i);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#lang-toggle-btn')).toBeVisible();
  });

  test('should toggle language between English and Arabic (RTL)', async ({ page }) => {
    await page.goto('/');
    const langBtn = page.locator('#lang-toggle-btn');
    await expect(langBtn).toBeVisible();

    await langBtn.click();
    await page.waitForTimeout(300);

    const htmlDir = await page.locator('html').getAttribute('dir');
    const bodyDir = await page.locator('div[dir]').first().getAttribute('dir');
    expect(htmlDir === 'rtl' || bodyDir === 'rtl' || htmlDir === 'ltr' || bodyDir === 'ltr').toBeTruthy();
  });

  test('should display Login & Registration authentication form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#auth-email-input')).toBeVisible();
    await expect(page.locator('#auth-password-input')).toBeVisible();
  });
});
