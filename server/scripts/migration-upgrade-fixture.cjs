/* Build, upgrade, verify, and remove only run-unique schemas in eduplatform_test. */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '..');
const fixtureFile = path.join(root, '.env.test');
const fixture = fs.existsSync(fixtureFile) ? dotenv.parse(fs.readFileSync(fixtureFile)) : {};
const env = { ...process.env, ...fixture, NODE_ENV: 'test' };
const isAllowedUrl = (raw) => {
  try {
    const url = new URL(raw);
    return ['postgres:', 'postgresql:'].includes(url.protocol)
      && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname)
      && url.pathname === '/eduplatform_test';
  } catch { return false; }
};
for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
  if (!isAllowedUrl(env[key])) throw new Error(`Refusing migration fixture: ${key} must target loopback/eduplatform_test.`);
}
if (new URL(env.DATABASE_URL).host !== new URL(env.DIRECT_URL).host
  || new URL(env.DATABASE_URL).pathname !== new URL(env.DIRECT_URL).pathname) {
  throw new Error('Refusing migration fixture: runtime and migration URLs must target the same dedicated test database.');
}

const { PrismaClient } = require('@prisma/client');
const cli = require.resolve('prisma/build/index.js');
const baseline = '20261022000000_pre_m0_baseline';
const suffix = `${process.pid}_${crypto.randomBytes(4).toString('hex')}`;
const emptySchema = `eng05e_${suffix}`;
const populatedSchema = `eng05p_${suffix}`;
const driftSchema = `eng05d_${suffix}`;
const ownedSchemas = [];
const withSchema = (raw, schema) => {
  const url = new URL(raw);
  url.searchParams.set('schema', schema);
  return url.toString();
};
const run = (args, schema, extra = {}, capture = false) => {
  const childEnv = {
    ...env,
    ...extra,
    DATABASE_URL: withSchema(env.DATABASE_URL, schema),
    DIRECT_URL: withSchema(env.DIRECT_URL, schema)
  };
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root, env: childEnv, encoding: capture ? 'utf8' : undefined,
    maxBuffer: 16 * 1024 * 1024, stdio: capture ? 'pipe' : 'inherit'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Prisma command failed (${args.join(' ')}), exit ${result.status ?? 'unknown'}.`);
  return result.stdout;
};
const assertSchemaMatches = (schema, datamodel) => run([
  'migrate', 'diff',
  '--from-schema-datasource', datamodel,
  '--to-schema-datamodel', datamodel,
  '--exit-code'
], schema);
const id = {
  teacher: 'eng05-10000000-0000-4000-8000-000000000001',
  student: 'eng05-10000000-0000-4000-8000-000000000002',
  stage: 'eng05-20000000-0000-4000-8000-000000000001',
  grade: 'eng05-20000000-0000-4000-8000-000000000002',
  subject: 'eng05-20000000-0000-4000-8000-000000000003',
  course: 'eng05-30000000-0000-4000-8000-000000000001',
  section: 'eng05-30000000-0000-4000-8000-000000000002',
  lesson: 'eng05-30000000-0000-4000-8000-000000000003',
  quiz: 'eng05-40000000-0000-4000-8000-000000000001',
  quizAttempt: 'eng05-40000000-0000-4000-8000-000000000002',
  assignment: 'eng05-50000000-0000-4000-8000-000000000001',
  submission: 'eng05-50000000-0000-4000-8000-000000000002',
  file: 'eng05-50000000-0000-4000-8000-000000000003',
  pool: 'eng05-60000000-0000-4000-8000-000000000001',
  question: 'eng05-60000000-0000-4000-8000-000000000002',
  assessment: 'eng05-60000000-0000-4000-8000-000000000003',
  assessmentAttempt: 'eng05-60000000-0000-4000-8000-000000000004',
  product: 'eng05-70000000-0000-4000-8000-000000000001',
  order: 'eng05-70000000-0000-4000-8000-000000000002',
  entitlement: 'eng05-70000000-0000-4000-8000-000000000003',
  config: 'eng05-80000000-0000-4000-8000-000000000001'
};
const tables = [
  'users', 'educational_stages', 'grades', 'subjects', 'courses', 'sections', 'lessons',
  'lesson_progress', 'quizzes', 'quiz_attempts', 'assignments', 'assignment_submissions',
  'assignment_submission_files', 'question_pools', 'question_items', 'assessments',
  'assessment_attempts', 'products', 'orders', 'entitlements', 'app_configs'
];
const stableRows = {
  users: `SELECT id, email, password, name, role::text AS role, "isActive", "teacherStatus"::text AS "teacherStatus", "gradeId", "createdAt", "updatedAt" FROM "users" ORDER BY id`,
  courses: `SELECT to_jsonb(x)::text AS row FROM "courses" x ORDER BY id`,
  sections: `SELECT to_jsonb(x)::text AS row FROM "sections" x ORDER BY id`,
  lessons: `SELECT to_jsonb(x)::text AS row FROM "lessons" x ORDER BY id`,
  lesson_progress: `SELECT to_jsonb(x)::text AS row FROM "lesson_progress" x ORDER BY id`,
  quiz_attempts: `SELECT to_jsonb(x)::text AS row FROM "quiz_attempts" x ORDER BY id`,
  assignment_submissions: `SELECT to_jsonb(x)::text AS row FROM "assignment_submissions" x ORDER BY id`,
  assignment_submission_files: `SELECT to_jsonb(x)::text AS row FROM "assignment_submission_files" x ORDER BY id`,
  assessment_attempts: `SELECT to_jsonb(x)::text AS row FROM "assessment_attempts" x ORDER BY id`,
  orders: `SELECT to_jsonb(x)::text AS row FROM "orders" x ORDER BY id`,
  entitlements: `SELECT to_jsonb(x)::text AS row FROM "entitlements" x ORDER BY id`
};

async function seed(prisma) {
  const now = new Date('2025-06-15T10:00:00.000Z');
  const later = new Date('2026-06-15T10:00:00.000Z');
  await prisma.$executeRawUnsafe(`INSERT INTO "educational_stages" (id, "nameEn", "nameAr", code, "sortOrder", "createdAt", "updatedAt") VALUES
    ('${id.stage}', 'Secondary', 'الثانوية', 'ENG05_SECONDARY', 1, '${now.toISOString()}', '${now.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "grades" (id, "stageId", "nameEn", "nameAr", code, "sortOrder", "createdAt", "updatedAt") VALUES
    ('${id.grade}', '${id.stage}', 'First Secondary', 'الصف الأول الثانوي', 'ENG05_SEC_1', 1, '${now.toISOString()}', '${now.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "subjects" (id, "nameEn", "nameAr", "createdAt", "updatedAt") VALUES
    ('${id.subject}', 'Physics', 'الفيزياء', '${now.toISOString()}', '${now.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "users" (id, email, password, name, role, "isActive", "teacherStatus", "gradeId", "createdAt", "updatedAt") VALUES
    ('${id.teacher}', 'eng05-teacher@example.invalid', 'synthetic-hash-not-a-credential', 'Fixture Teacher', 'TEACHER', true, 'APPROVED', NULL, '${now.toISOString()}', '${now.toISOString()}'),
    ('${id.student}', 'eng05-student@example.invalid', 'synthetic-hash-not-a-credential', 'Fixture Student', 'STUDENT', true, NULL, '${id.grade}', '${now.toISOString()}', '${now.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "courses" (id, "titleEn", "titleAr", description, "teacherId", "subjectId", "gradeId", status, visibility, "isPublished", "createdAt", "updatedAt") VALUES
    ('${id.course}', 'Fixture course', 'مقرر اختباري', 'Synthetic migration fixture', '${id.teacher}', '${id.subject}', '${id.grade}', 'PUBLISHED', 'PRIVATE', true, '${now.toISOString()}', '${now.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "sections" (id, "courseId", "titleEn", "titleAr", "orderIndex", "isFreePreview", "createdAt", "updatedAt") VALUES
    ('${id.section}', '${id.course}', 'Unit one', 'الوحدة الأولى', 7, true, '${now.toISOString()}', '${now.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "quizzes" (id, "titleEn", "titleAr", "passingScore", "maxAttempts", "createdAt", "updatedAt") VALUES
    ('${id.quiz}', 'Fixture quiz', 'اختبار تجريبي', 75, 3, '${now.toISOString()}', '${now.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "lessons" (id, "sectionId", "titleEn", "titleAr", content, "orderIndex", "estimatedDuration", "quizId", "createdAt", "updatedAt") VALUES
    ('${id.lesson}', '${id.section}', 'Lesson one', 'الدرس الأول', 'Uploaded text remains unchanged.', 9, 25, '${id.quiz}', '${now.toISOString()}', '${now.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "lesson_progress" (id, "userId", "lessonId", "watchTimeSec", "isCompleted", "lastWatched") VALUES
    ('eng05-progress', '${id.student}', '${id.lesson}', 173, true, '${later.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "quiz_attempts" (id, "quizId", "userId", score, answers, "isPassed", status, "timeSpentSec", "startedAt", "completedAt") VALUES
    ('${id.quizAttempt}', '${id.quiz}', '${id.student}', 88, '[{"questionId":"historical-q1","selectedOptionId":"b"}]'::jsonb, true, 'COMPLETED', 312, '${now.toISOString()}', '${later.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "assignments" (id, "createdById", "titleEn", "titleAr", "maxScore", "maxAttempts", "createdAt", "updatedAt") VALUES
    ('${id.assignment}', '${id.teacher}', 'Fixture assignment', 'واجب تجريبي', 30, 2, '${now.toISOString()}', '${now.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "assignment_submissions" (id, "assignmentId", "studentId", "submissionText", status, score, feedback, "gradedById", "gradedAt", "submittedAt", "createdAt", "updatedAt") VALUES
    ('${id.submission}', '${id.assignment}', '${id.student}', 'Synthetic historical answer', 'GRADED', 27, 'Good work', '${id.teacher}', '${later.toISOString()}', '${now.toISOString()}', '${now.toISOString()}', '${later.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "assignment_submission_files" (id, "submissionId", "fileUrl", "fileName", "sizeBytes", "createdAt") VALUES
    ('${id.file}', '${id.submission}', 'private/fixture/student-work.pdf', 'student-work.pdf', 128, '${now.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "question_pools" (id, "titleEn", "titleAr", "createdAt", "updatedAt") VALUES
    ('${id.pool}', 'Fixture pool', 'مجموعة تجريبية', '${now.toISOString()}', '${now.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "question_items" (id, "poolId", "textEn", "textAr", "optionsJson", "correctAnswerJson", points, "createdAt", "updatedAt") VALUES
    ('${id.question}', '${id.pool}', 'Legacy question', 'سؤال سابق', '[]', '"b"', 5, '${now.toISOString()}', '${now.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "assessments" (id, "poolId", "titleEn", "titleAr", "durationMinutes", "passingScore", "totalQuestions", "maxAttempts", "createdAt", "updatedAt") VALUES
    ('${id.assessment}', '${id.pool}', 'Fixture assessment', 'تقييم تجريبي', 40, 70, 1, 2, '${now.toISOString()}', '${now.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "assessment_attempts" (id, "assessmentId", "studentId", "expiresAt", score, "isPassed", status, "questionsSnapshotJson", "studentAnswersJson", "createdAt", "updatedAt") VALUES
    ('${id.assessmentAttempt}', '${id.assessment}', '${id.student}', '${later.toISOString()}', 90, true, 'SUBMITTED', '[{"id":"snapshot-q","answer":"b"}]', '[{"questionId":"snapshot-q","answer":"b"}]', '${now.toISOString()}', '${later.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "products" (id, "nameEn", "nameAr", "productType", "resourceId", "priceEgp", "priceUsd", "createdAt", "updatedAt") VALUES
    ('${id.product}', 'Fixture course access', 'إتاحة مقرر تجريبي', 'COURSE', '${id.course}', 125.50, 2.50, '${now.toISOString()}', '${now.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "orders" (id, "studentId", "productId", status, "totalAmountEgp", "totalAmountUsd", "paymentMethod", "transactionRef", "idempotencyKey", "createdAt", "updatedAt") VALUES
    ('${id.order}', '${id.student}', '${id.product}', 'PAID', 125.50, 2.50, 'MANUAL', 'FIXTURE-TRANSFER-001', 'eng05-fixture-order-1', '${now.toISOString()}', '${later.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "entitlements" (id, "studentId", "orderId", "resourceType", "resourceId", "sourceType", "startsAt", "expiresAt", status, "createdAt", "updatedAt") VALUES
    ('${id.entitlement}', '${id.student}', '${id.order}', 'COURSE', '${id.course}', 'PURCHASE', '${now.toISOString()}', '${later.toISOString()}', 'ACTIVE', '${now.toISOString()}', '${now.toISOString()}')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "app_configs" (id, currency, "exchangeRateUsdToEgp", "createdAt", "updatedAt") VALUES
    ('${id.config}', 'USD', 60, '${now.toISOString()}', '${now.toISOString()}')`);
}

async function snapshot(prisma) {
  const counts = {};
  for (const table of tables) {
    const rows = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count FROM "${table}"`);
    counts[table] = rows[0].count;
    const expected = table === 'users' ? 2 : 1;
    if (counts[table] !== expected) throw new Error(`Fixture expected ${expected} ${table} row(s), found ${counts[table]}.`);
  }
  const data = {};
  for (const [table, query] of Object.entries(stableRows)) data[table] = await prisma.$queryRawUnsafe(query);
  return JSON.stringify({ counts, data });
}

async function runFixture() {
  const admin = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
  try {
    const generatedBaseline = run([
      'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/fixtures/m0-before.prisma', '--script'
    ], emptySchema, {}, true);
    const checkedInBaseline = fs.readFileSync(path.join(root, 'prisma/migrations', baseline, 'migration.sql'), 'utf8').replace(/\r\n/g, '\n');
    const normalizedGeneratedBaseline = generatedBaseline.replace(/\r\n/g, '\n').replace(/\n+$/, '');
    if (normalizedGeneratedBaseline !== checkedInBaseline.replace(/\n+$/, '')) throw new Error('Initial SQL is not the generated baseline for the committed pre-M0 Prisma snapshot.');

    console.log('Creating a fresh empty-install schema in the dedicated test database.');
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${emptySchema}"`);
    ownedSchemas.push(emptySchema);
    run(['migrate', 'deploy'], emptySchema);
    assertSchemaMatches(emptySchema, 'prisma/schema.prisma');
    run(['migrate', 'deploy'], emptySchema);
    console.log('Empty installation matches the current schema; repeated deploy is idempotent.');

    console.log('Verifying schema drift is rejected before any migration history is written.');
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${driftSchema}"`);
    ownedSchemas.push(driftSchema);
    run(['db', 'push', '--schema', 'prisma/fixtures/m0-before.prisma', '--skip-generate'], driftSchema);
    await admin.$executeRawUnsafe(`CREATE TABLE "${driftSchema}"."eng05_unexpected_table" (id integer PRIMARY KEY)`);
    const driftEnv = {
      ...env,
      DATABASE_URL: withSchema(env.DATABASE_URL, driftSchema),
      DIRECT_URL: withSchema(env.DIRECT_URL, driftSchema)
    };
    const driftCheck = spawnSync(process.execPath, [cli, 'migrate', 'diff', '--from-schema-datasource', 'prisma/fixtures/m0-before.prisma', '--to-schema-datamodel', 'prisma/fixtures/m0-before.prisma', '--exit-code'], {
      cwd: root, env: driftEnv, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
    });
    if (driftCheck.error) throw driftCheck.error;
    if (driftCheck.status !== 2) throw new Error(`Expected Prisma to reject the drifted schema with exit 2; received ${driftCheck.status ?? 'unknown'}.`);
    const migrationHistory = await admin.$queryRawUnsafe(
      'SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2',
      driftSchema, '_prisma_migrations'
    );
    if (migrationHistory.length !== 0) throw new Error('Drift check wrote migration history before baseline review.');
    console.log('Drift was detected by a read-only diff; no migration history was created.');

    console.log('Creating an isolated populated database schema at the exact pre-M0 Prisma snapshot.');
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${populatedSchema}"`);
    ownedSchemas.push(populatedSchema);
    run(['db', 'push', '--schema', 'prisma/fixtures/m0-before.prisma', '--skip-generate'], populatedSchema);
    assertSchemaMatches(populatedSchema, 'prisma/fixtures/m0-before.prisma');

    const existing = new PrismaClient({ datasources: { db: { url: withSchema(env.DATABASE_URL, populatedSchema) } } });
    let before;
    try {
      await seed(existing);
      before = await snapshot(existing);
    } finally { await existing.$disconnect(); }

    console.log('Resolving the baseline only after the read-only pre-M0 schema diff is empty.');
    run(['migrate', 'resolve', '--applied', baseline], populatedSchema);
    run(['migrate', 'deploy'], populatedSchema);

    const upgraded = new PrismaClient({ datasources: { db: { url: withSchema(env.DATABASE_URL, populatedSchema) } } });
    try {
      const after = await snapshot(upgraded);
      if (before !== after) throw new Error('User/course/lesson/progress/assessment/assignment/payment rows changed during migration.');
      const versions = await upgraded.$queryRawUnsafe(`SELECT "authVersion" FROM "users" ORDER BY id`);
      if (versions.length !== 2 || versions.some(row => row.authVersion !== 1)) throw new Error('M0 auth-version migration did not preserve the expected version-1 session policy.');
      const config = await upgraded.$queryRawUnsafe(`SELECT version, currency, "exchangeRateUsdToEgp" FROM "app_configs" WHERE id = '${id.config}'`);
      if (config.length !== 1 || config[0].version !== 1 || config[0].currency !== 'EGP' || Number(config[0].exchangeRateUsdToEgp) !== 60) {
        throw new Error('ENG-02 config migration did not preserve the saved rate and initialize version/EGP currency.');
      }
      assertSchemaMatches(populatedSchema, 'prisma/schema.prisma');
      run(['migrate', 'deploy'], populatedSchema);
      if (before !== await snapshot(upgraded)) throw new Error('Repeated migration deploy changed preserved data.');
      console.log(`Populated upgrade passed. Preserved ${tables.length + 1} rows across ${tables.length} tables, initialized AppConfig version/currency, and set authVersion=1 for both accounts.`);
    } finally { await upgraded.$disconnect(); }
  } finally {
    await admin.$disconnect();
    for (const schema of ownedSchemas.reverse()) {
      await admin.$connect();
      try {
        await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        const remnants = await admin.$queryRawUnsafe('SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1', schema);
        if (remnants.length !== 0) throw new Error(`Could not remove fixture schema ${schema}.`);
      }
      finally { await admin.$disconnect(); }
    }
  }
}

runFixture().catch(error => {
  console.error(`[migration-fixture] ${error.message}`);
  process.exitCode = 1;
});
