import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const fixture = JSON.parse(fs.readFileSync(process.env.M0_FIXTURE_PATH!, 'utf8'));

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.locator('#auth-email-input').fill(email);
  await page.locator('#auth-password-input').fill(fixture.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/student\/dashboard/, { timeout: process.env.M0_WEB_MODE === 'dev' ? 30_000 : 10_000 });
  const onboarding = page.getByRole('dialog', { name: 'Choose your target faculty' });
  await expect(onboarding).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(onboarding).toBeHidden();
}

for (const locale of ['en', 'ar']) {
  test(`${locale}: enroll, view an authenticated PDF and submit an uploaded assignment`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const course = fixture.courses[locale];
    await login(page, fixture.users[info.project.name].email);
    if (locale === 'ar') await page.locator('#lang-toggle-btn').click();
    await page.goto(`/courses/${course.id}`);
    const enroll = page.getByRole('button', { name: locale === 'ar' ? /سجّل الآن/ : /Enroll Now/ });
    await expect(enroll).toBeVisible();
    const curriculum = page.waitForResponse((response) => response.url().includes(`/courses/${course.id}/learning`) && response.status() === 200);
    await enroll.click();
    await curriculum;
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.getByRole('button', { name: locale === 'ar' ? /درس الاختبار/ : /M0 lesson/ })).toBeVisible();
    const materialRequest = page.waitForRequest((request) => request.url().includes(`/materials/${course.materialId}/content`));
    await page.getByRole('button', { name: /PDF Materials/ }).click();
    expect((await materialRequest).headers().authorization).toMatch(/^Bearer /);
    await expect(page.getByTitle('M0 study PDF')).toHaveAttribute('src', /^blob:/);
    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download' }).click();
    expect((await download).suggestedFilename()).toBeTruthy();
    await page.getByRole('button', { name: 'Assignments', exact: true }).click();
    await page.locator('input[type=file]').setInputFiles({ name: 'answer.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nM0 answer\n%%EOF') });
    await expect(page.getByText(locale === 'ar' ? 'تم رفع الملف بنجاح' : 'File uploaded successfully')).toBeVisible();
    const submission = page.waitForResponse((response) => response.url().endsWith(`/assignments/${course.assignmentId}/submit`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: locale === 'ar' ? 'تسليم الواجب' : 'Submit Assignment', exact: true }).click();
    expect((await submission).status()).toBe(201);
    await expect(page.getByText(locale === 'ar' ? 'تم التسليم (في انتظار التصحيح)' : 'Submitted (Pending Review)', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('guest APIs omit curriculum and keep staged capabilities unavailable', async ({ request }) => {
  const response = await request.get(`/api/v1/courses/${fixture.courses.en.id}`);
  expect(response.ok()).toBeTruthy();
  const catalog = (await response.json()).data;
  expect(catalog).not.toHaveProperty('modules');
  expect(catalog).not.toHaveProperty('sections');
  expect((await request.get(`/api/v1/materials/${fixture.courses.en.materialId}/content`)).status()).toBe(401);
  expect((await request.post('/api/v1/playgrounds/execute', { data: { code: 'print(1)', language: 'python' } })).status()).toBe(503);
  expect((await request.get('/api/v1/boards/unknown')).status()).toBe(503);
  for (const endpoint of ['/developer/tokens', '/developer/webhooks']) {
    const unavailable = await request.get(`/api/v1${endpoint}`);
    expect(unavailable.status()).toBe(503);
    expect((await unavailable.json()).code).toBe('FEATURE_DISABLED');
  }
  expect((await request.post('/api/v1/commerce/webhooks/paymob', { data: {} })).status()).toBe(503);
  expect((await request.post('/api/v1/ai/tutor', { data: { prompt: 'test' } })).status()).toBe(404);
});

test('pending and rejected teachers cannot obtain a platform session', async ({ request }) => {
  for (const name of ['pending', 'rejected']) {
    const response = await request.post('/api/v1/auth/login', { data: { email: fixture.users[name].email, password: fixture.password } });
    expect(response.status()).toBe(403);
    expect(response.headers()['set-cookie']).toBeUndefined();
  }
});

test('renews a real paused video while preserving position and speed', async ({ page, request }, info) => {
  await login(page, fixture.users[info.project.name].email);
  const bytes = fs.readFileSync(path.join(__dirname, '../fixtures/renewal.webm'));
  const loginResponse = await request.post('/api/v1/auth/login', { data: { email: fixture.users.teacher.email, password: fixture.password } });
  expect(loginResponse.status()).toBe(200);
  const token = (await loginResponse.json()).data.tokens.accessToken;
  const headers = { Authorization: `Bearer ${token}` };
  const uploaded = await request.post('/api/v1/videos/upload', { headers, multipart: { file: { name: 'm0.webm', mimeType: 'video/webm', buffer: Buffer.from(bytes) } } });
  expect(uploaded.status()).toBe(201);
  const video = (await uploaded.json()).data;
  const attached = await request.post(`/api/v1/courses/lessons/${fixture.courses.en.lessonId}/video`, { headers, data: { videoUrl: video.videoUrl, title: 'M0 clip' } });
  expect(attached.ok()).toBeTruthy();
  const videoId = (await attached.json()).data.id;
  await page.clock.install();
  await page.goto(`/courses/${fixture.courses.en.id}`);
  const player = page.locator('video');
  await expect.poll(() => player.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(1);
  await player.evaluate((element: HTMLVideoElement) => { element.pause(); element.currentTime = 0.3; element.playbackRate = 1.5; });
  const original = await player.getAttribute('src');
  const renewed = page.waitForResponse((response) => response.url().includes(`/videos/${videoId}/playback-url`));
  await page.clock.fastForward(91_000);
  expect((await renewed).status()).toBe(200);
  await expect(player).not.toHaveAttribute('src', original!);
  await expect.poll(() => player.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(0.3, 1);
  expect(await player.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  expect(await player.evaluate((element: HTMLVideoElement) => element.playbackRate)).toBe(1.5);
});
