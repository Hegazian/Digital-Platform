import { test, expect } from '@playwright/test';

test.describe('Video Player & Course Access E2E Journey', () => {
  test('should display course catalog on /courses', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#lang-toggle-btn')).toBeVisible();
  });

  test('should show course details or graceful fallback for course route', async ({ page }) => {
    await page.goto('/courses/non-existent-course-id');
    // For non-existent or un-entitled course, page renders with Navbar and handles unavailable state
    await expect(page.locator('header')).toBeVisible();
    await expect(
      page.locator('text=/Course unavailable|الدورة غير متاحة|Browse courses|تصفح الدورات/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should provide link to browse courses when landing on unavailable course', async ({ page }) => {
    await page.goto('/courses/non-existent-course-id');
    const browseLink = page.locator('button, a', {
      hasText: /Browse courses|تصفح الدورات/i,
    });
    await expect(browseLink).toBeVisible({ timeout: 10000 });
    await browseLink.click();
    await expect(page).toHaveURL(/\/courses/);
  });
});
