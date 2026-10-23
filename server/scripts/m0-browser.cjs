const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const root = path.resolve(__dirname, '../..');
const server = path.join(root, 'server');
const client = path.join(root, 'client');
const testFile = path.join(server, '.env.test');
const fixtureEnv = fs.existsSync(testFile) ? require('dotenv').parse(fs.readFileSync(testFile)) : {};
const runId = crypto.randomUUID();
const runRoot = path.join(root, '.cache', 'm0', runId);
const env = { ...process.env, ...fixtureEnv, NODE_ENV: 'test',
  JWT_SECRET: crypto.randomBytes(48).toString('hex'), JWT_REFRESH_SECRET: crypto.randomBytes(48).toString('hex'),
  SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', CLAMAV_HOST: '', RESEND_API_KEY: '',
  UPLOADS_DIR: path.join(runRoot, 'uploads'), M0_FIXTURE_PATH: path.join(runRoot, 'fixture.json'),
  API_PROXY_TARGET: 'http://127.0.0.1:5100', CLIENT_URL: 'http://127.0.0.1:3100', PORT: '5100',
};
for (const name of ['DATABASE_URL', 'DIRECT_URL']) {
  const url = new URL(env[name]);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname) || url.pathname !== '/eduplatform_test') throw new Error(`Refusing unsafe ${name} for browser tests`);
}
const db = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
const ids = { users: [], courses: [], subjects: [], products: [] };
const webProcesses = [];
function runNodeCli(cli, args, cwd, extra = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, env: { ...env, ...extra }, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Build ${path.relative(root, cli)} failed (${result.status})`);
}
function startWebProcess(command, args, cwd, processEnv) {
  const child = spawn(command, args, { cwd, env: processEnv, stdio: 'inherit', windowsHide: true });
  child.startError = undefined;
  child.once('error', (error) => { child.startError = error; });
  webProcesses.push(child);
  return child;
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function waitForReady(url, child, label, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.startError) throw new Error(`${label} failed to start: ${child.startError.message}`);
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`${label} exited before becoming ready (code=${child.exitCode}, signal=${child.signalCode})`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
      if (response.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error(`${label} did not become ready at ${url} within ${timeoutMs} ms`);
}
async function stopWebProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const closed = new Promise((resolve) => child.once('close', resolve));
  try { child.kill('SIGTERM'); } catch {}
  let stopped = await Promise.race([closed.then(() => true), delay(12_000).then(() => false)]);
  if (!stopped) {
    try { child.kill('SIGKILL'); } catch {}
    stopped = await Promise.race([closed.then(() => true), delay(2_000).then(() => false)]);
  }
  if (!stopped) {
    console.error(`Could not stop browser test process ${child.pid}.`);
    process.exitCode = 1;
  }
}
async function stopWebProcesses() {
  await Promise.all(webProcesses.map(stopWebProcess));
  webProcesses.length = 0;
}
function runPlaywright(command, args, cwd, processEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: processEnv, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
}
async function main() {
  fs.mkdirSync(path.join(env.UPLOADS_DIR, 'lesson-materials'), { recursive: true });
  const password = `M0-${crypto.randomUUID()}!`;
  const hash = await bcrypt.hash(password, 10);
  const fixture = { password, users: {}, courses: {}, uploadRoot: env.UPLOADS_DIR };
  for (const [name, role] of Object.entries({ teacher: 'TEACHER', chromium: 'STUDENT', 'mobile-chrome': 'STUDENT', outsider: 'STUDENT', 'outsider-chromium': 'STUDENT', 'outsider-mobile-chrome': 'STUDENT', pending: 'TEACHER', rejected: 'TEACHER', admin: 'ADMIN' })) {
    const user = await db.user.create({ data: { name: `M0 ${name}`, email: `m0-${runId}-${name}@test.invalid`, password: hash, role,
      teacherStatus: role === 'TEACHER' ? name === 'pending' ? 'PENDING' : name === 'rejected' ? 'REJECTED' : 'APPROVED' : null } });
    ids.users.push(user.id);
    fixture.users[name] = { id: user.id, email: user.email };
  }
  const subject = await db.subject.create({ data: { nameEn: `M0 ${runId}`, nameAr: 'مادة الاختبار' } });
  ids.subjects.push(subject.id);
  for (const locale of ['en', 'ar']) {
    const course = await db.course.create({ data: { titleEn: `M0 course ${locale}`, titleAr: `دورة اختبار ${locale}`, description: 'Disposable M0 browser fixture', subjectId: subject.id, teacherId: fixture.users.teacher.id, status: 'PUBLISHED', isPublished: true, isFree: true } });
    ids.courses.push(course.id);
    const module = await db.courseModule.create({ data: { courseId: course.id, titleEn: 'Uploaded unit', titleAr: 'وحدة مرفوعة' } });
    const lesson = await db.lesson.create({ data: { moduleId: module.id, titleEn: `M0 lesson ${locale}`, titleAr: `درس الاختبار ${locale}`, orderIndex: 0 } });
    async function document(title) {
      const id = crypto.randomUUID();
      const file = `${crypto.randomUUID()}.pdf`;
      const directory = path.join(env.UPLOADS_DIR, 'lesson-materials', id);
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(path.join(directory, file), '%PDF-1.7\nM0 study fixture\n%%EOF');
      return db.material.create({ data: { id, lessonId: lesson.id, title, fileType: 'application/pdf', fileUrl: `/uploads/lesson-materials/${id}/${file}`, sizeBytes: 40 } });
    }
    const material = await document('M0 study PDF');
    const secondMaterial = await document('M0 second PDF');
    const assignment = await db.assignment.create({ data: { lessonId: lesson.id, createdById: fixture.users.teacher.id, titleEn: 'M0 assignment', titleAr: 'واجب الاختبار', maxAttempts: 3 } });
    fixture.courses[locale] = { id: course.id, lessonId: lesson.id, materialId: material.id, secondMaterialId: secondMaterial.id, assignmentId: assignment.id };
  }
  const paidCourse = await db.course.create({ data: {
    titleEn: 'M0 paid course en',
    titleAr: 'دورة اختبار مدفوعة',
    description: 'Disposable paid-course checkout fixture',
    subjectId: subject.id,
    teacherId: fixture.users.teacher.id,
    status: 'PUBLISHED',
    isPublished: true,
    isFree: false,
  } });
  ids.courses.push(paidCourse.id);
  const paidProduct = await db.product.create({ data: {
    nameEn: paidCourse.titleEn,
    nameAr: paidCourse.titleAr,
    productType: 'COURSE',
    resourceId: paidCourse.id,
    priceEgp: 250,
    priceUsd: 5,
  } });
  ids.products.push(paidProduct.id);
  fixture.courses.paid = { id: paidCourse.id, productId: paidProduct.id, priceEgp: 250 };
  const renewalVideoId = crypto.randomUUID();
  const renewalSource = path.join(client, 'e2e', 'fixtures', 'renewal.webm');
  const renewalName = 'renewal.webm';
  const renewalObjectName = `${crypto.randomUUID()}.webm`;
  const renewalDirectory = path.join(env.UPLOADS_DIR, 'lesson-videos', renewalVideoId);
  fs.mkdirSync(renewalDirectory, { recursive: true });
  fs.copyFileSync(renewalSource, path.join(renewalDirectory, renewalObjectName));
  await db.video.create({
    data: {
      id: renewalVideoId,
      teacherId: fixture.users.teacher.id,
      videoUrl: `/uploads/lesson-videos/${renewalVideoId}/${renewalObjectName}`,
      originalFileName: renewalName,
      sizeBytes: fs.statSync(renewalSource).size,
      status: 'READY',
    },
  });
  await db.lesson.update({ where: { id: fixture.courses.en.lessonId }, data: { videoId: renewalVideoId } });
  fixture.renewalVideoId = renewalVideoId;
  fs.writeFileSync(env.M0_FIXTURE_PATH, JSON.stringify(fixture));
  runNodeCli(path.join(server, 'node_modules', 'typescript', 'bin', 'tsc'), [], server);
  if (env.M0_WEB_MODE !== 'dev') {
    runNodeCli(path.join(client, 'node_modules', 'next', 'dist', 'bin', 'next'), ['build'], client, { NODE_ENV: 'production' });
  }

  const api = startWebProcess(process.execPath, [path.join(server, 'dist', 'server.js')], server, { ...env, NODE_ENV: 'test', PORT: '5100' });
  await waitForReady('http://127.0.0.1:5100/', api, 'M0 API', 60_000);
  const development = env.M0_WEB_MODE === 'dev';
  const nextCli = path.join(client, 'node_modules', 'next', 'dist', 'bin', 'next');
  const web = startWebProcess(process.execPath, [nextCli, development ? 'dev' : 'start', '--hostname', '127.0.0.1', '--port', '3100'], client,
    { ...env, NODE_ENV: development ? 'development' : 'production' });
  await waitForReady('http://127.0.0.1:3100/', web, 'M0 web client', 120_000);

  const cli = path.join(path.dirname(require.resolve('@playwright/test/package.json', { paths: [client] })), 'cli.js');
  const result = await runPlaywright(process.execPath, [cli, 'test', '--config=playwright.m0.config.ts', ...process.argv.slice(2)], client, env);
  if (result.code !== 0) process.exitCode = result.code ?? 1;
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  try {
    await stopWebProcesses();
  } finally {
    try {
      await db.product.deleteMany({ where: { id: { in: ids.products } } });
      await db.course.deleteMany({ where: { id: { in: ids.courses } } });
      await db.video.deleteMany({ where: { teacherId: { in: ids.users } } });
      await db.subject.deleteMany({ where: { id: { in: ids.subjects } } });
      await db.user.deleteMany({ where: { id: { in: ids.users } } });
    } finally {
      await db.$disconnect();
      // Remove only this runner's generated directory, verified inside the workspace cache.
      const cache = path.resolve(root, '.cache', 'm0') + path.sep;
      if (!path.resolve(runRoot).startsWith(cache)) throw new Error('Unsafe browser fixture cleanup path');
      fs.rmSync(runRoot, { recursive: true, force: true });
    }
  }
});
