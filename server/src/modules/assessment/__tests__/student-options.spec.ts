import { describe, expect, it } from 'vitest';
import { studentOptions } from '../student-options';

describe('student option DTO allowlist', () => {
  it('preserves bilingual display fields while stripping authoring keys and nested answer data', () => {
    expect(studentOptions([{ id: 'a', textEn: 'First', textAr: 'الأول', isCorrect: true, correctAnswer: 'a', explanation: 'private', metadata: { answerKey: true } }]))
      .toEqual([{ id: 'a', textEn: 'First', textAr: 'الأول' }]);
  });
  it('handles legacy text arrays without exposing malformed objects', () => {
    expect(studentOptions(['Answer', null, 2])).toEqual(['Answer', {}, {}]);
    expect(studentOptions({ correctAnswer: 'a' })).toEqual([]);
  });
});
