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
});
