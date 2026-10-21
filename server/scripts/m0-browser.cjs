const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
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
const ids = { users: [], courses: [], subjects: [] };
function npm(args, cwd, extra = {}) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { cwd, env: { ...env, ...extra }, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) throw new Error(`npm ${args.join(' ')} failed (${result.status})`);
}
async function main() {
  fs.mkdirSync(path.join(env.UPLOADS_DIR, 'lesson-materials'), { recursive: true });
  const password = `M0-${crypto.randomUUID()}!`;
  const hash = await bcrypt.hash(password, 10);
  const fixture = { password, users: {}, courses: {}, uploadRoot: env.UPLOADS_DIR };
  for (const [name, role] of Object.entries({ teacher: 'TEACHER', chromium: 'STUDENT', 'mobile-chrome': 'STUDENT', outsider: 'STUDENT', pending: 'TEACHER', rejected: 'TEACHER', admin: 'ADMIN' })) {
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
    const file = `${crypto.randomUUID()}.pdf`;
    fs.writeFileSync(path.join(env.UPLOADS_DIR, 'lesson-materials', file), '%PDF-1.7\nM0 study fixture\n%%EOF');
    const material = await db.material.create({ data: { lessonId: lesson.id, title: 'M0 study PDF', fileType: 'application/pdf', fileUrl: `/uploads/lesson-materials/${file}`, sizeBytes: 40 } });
    const assignment = await db.assignment.create({ data: { lessonId: lesson.id, createdById: fixture.users.teacher.id, titleEn: 'M0 assignment', titleAr: 'واجب الاختبار', maxAttempts: 3 } });
    fixture.courses[locale] = { id: course.id, lessonId: lesson.id, materialId: material.id, assignmentId: assignment.id };
  }
  fs.writeFileSync(env.M0_FIXTURE_PATH, JSON.stringify(fixture));
  npm(['run', 'build'], server);
  npm(['run', 'build'], client, { NODE_ENV: 'production' });
  const cli = path.join(path.dirname(require.resolve('@playwright/test/package.json', { paths: [client] })), 'cli.js');
  const result = spawnSync(process.execPath, [cli, 'test', '--config=playwright.m0.config.ts', ...process.argv.slice(2)], { cwd: client, env, stdio: 'inherit' });
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  try {
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
});
