import { test, expect, Page } from '@playwright/test';

/**
 * Dialog accessibility contract (a11y phase):
 * every modal built on <Modal> must trap focus, announce itself via
 * role=dialog + accessible name, close on Escape, and return focus.
 */

const API = 'http://127.0.0.1:5000/api/v1';

async function seedStudent() {
  const email = `a11y-${Date.now()}@test.com`;
  const password = 'Password123!';

  // Students must register with a student number + grade year.
  const stagesRes = await fetch(`${API}/academic/stages`);
  const stages = (await stagesRes.json()).data ?? [];
  const gradeId = stages?.[0]?.grades?.[0]?.id;
  if (!gradeId) {
    throw new Error('Seed failed: no academic stages/grades exist in the environment');
  }

  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      name: 'A11y Student',
      role: 'STUDENT',
      studentNumber: `A11Y-${Date.now()}`,
      gradeId,
    }),
  });
  if (!res.ok && res.status !== 409) {
    // Fail loudly: a silent 429/500 here used to surface much later as a
    // confusing login timeout.
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
  try {
    // First login compiles dashboard chunks under `next dev`; allow generously.
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
    // Wait for auth modal to unmount so it can't steal focus back later.
    await page.locator('#auth-email-input').waitFor({ state: 'detached', timeout: 10_000 });
  } catch (e) {
    // Surface the API/modal error text so failures are self-explaining.
    const formText = await page
      .locator('form')
      .first()
      .innerText()
      .catch(() => '(form not rendered)');
    throw new Error(`Login did not reach a dashboard. Form says: ${JSON.stringify(formText.slice(0, 300))}`);
  }
}

test.describe('Dialog accessibility', () => {
  let student: { email: string; password: string };

  test.beforeAll(async () => {
    student = await seedStudent();
  });

  async function openCareerPicker(page: Page) {
    // Fresh session storage so the once-per-session prompt reappears.
    // NOTE: 'networkidle' never settles under `next dev` (HMR sockets),
    // so waits use domcontentloaded + explicit dialog visibility instead.
    await page.goto('/student/dashboard', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    return dialog;
  }

  test('career picker announces itself as a named dialog and traps initial focus', async ({ page }) => {
    const s = await student;
    await loginViaUi(page, s.email, s.password);

    const dialog = await openCareerPicker(page);

    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toContainText('faculty');

    // Accessible name matches the heading topic
    const ariaLabel = await dialog.getAttribute('aria-label');
    expect(ariaLabel?.toLowerCase()).toContain('faculty');

    // Focus moved inside the dialog. The dashboard mounts the picker while
    // its data queries are still settling, so focus can land a tick late —
    // poll instead of asserting a single instantaneous snapshot.
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const el = document.activeElement;
            return !!el && !!el.closest('[role="dialog"]');
          }),
        { timeout: 5_000, intervals: [100, 250, 500] }
      )
      .toBe(true);
  });

  test('Escape closes the dialog and choice is skippable without loops', async ({ page }) => {
    const s = await student;
    await loginViaUi(page, s.email, s.password);

    const dialog = await openCareerPicker(page);
    await page.keyboard.press('Escape');

    await expect(page.locator('[role="dialog"]')).toHaveCount(0);

    // Dismissal persists across reload (sessionStorage flag)
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    void dialog;
  });

  test('Tab cycles within an open dialog instead of escaping to the page', async ({ page }) => {
    const s = await student;
    await loginViaUi(page, s.email, s.password);

    const dialog = await openCareerPicker(page);

    // Walk forward many times; active element must always stay in-dialog
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return !!el && !!el.closest('[role="dialog"]');
      });
      expect(inside).toBe(true);
    }
    void dialog;
  });
});
