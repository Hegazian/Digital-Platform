const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const contracts = require('../dist');
test('OpenAPI describes every exported runtime schema', () => {
  const api = JSON.parse(fs.readFileSync(require.resolve('../openapi.json'), 'utf8'));
  for (const [name, schema] of Object.entries(contracts)) {
    if (name.endsWith('Schema') && typeof schema.safeParse === 'function') assert.ok(api.components.schemas[name.replace(/Schema$/, '')]);
  }
});
test('catalog serialization cannot widen to nested answer keys or actor secrets', () => {
  const safe = contracts.CourseCatalogItemSchema.parse({ id: 'c', titleEn: 'Math', titleAr: 'رياضيات', description: '',
    teacherId: 't', subjectId: 's', status: 'PUBLISHED', isPublished: true, isFree: true, priceEgp: 0, priceUsd: 0,
    teacher: { id: 't', name: 'Teacher', password: 'never', mfaSecret: 'never' },
    lessons: [{ questions: [{ correctAnswer: 'never' }] }] });
  assert.equal(JSON.stringify(safe).includes('never'), false);
});
