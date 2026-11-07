import { describe, expect, it } from 'vitest';
import { DOMAINS, QuestionSchema, SEED_QUESTIONS } from '../../src/engine';

const norm = (t: string): string => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

describe('seed question bank', () => {
  it('every question passes the schema', () => {
    for (const q of SEED_QUESTIONS) expect(QuestionSchema.safeParse(q).success, q.id).toBe(true);
  });
  it('is never marked reviewed (no HR validation claimed)', () => {
    expect(SEED_QUESTIONS.every((q) => q.reviewed === false)).toBe(true);
  });
  it('has unique ids and no duplicate texts', () => {
    expect(new Set(SEED_QUESTIONS.map((q) => q.id)).size).toBe(SEED_QUESTIONS.length);
    expect(new Set(SEED_QUESTIONS.map((q) => norm(q.text))).size).toBe(SEED_QUESTIONS.length);
  });
  it('covers every domain with at least 5 questions across all three difficulties', () => {
    for (const d of DOMAINS) {
      const qs = SEED_QUESTIONS.filter((q) => q.domain === d);
      expect(qs.length).toBeGreaterThanOrEqual(5);
      expect(new Set(qs.map((q) => q.difficulty))).toEqual(new Set([1, 2, 3]));
    }
  });
  it('schema rejects violations', () => {
    expect(QuestionSchema.safeParse({ ...SEED_QUESTIONS[0], difficulty: 4 }).success).toBe(false);
    expect(QuestionSchema.safeParse({ ...SEED_QUESTIONS[0], domain: 'law' }).success).toBe(false);
    expect(QuestionSchema.safeParse({ ...SEED_QUESTIONS[0], keyPoints: [] }).success).toBe(false);
  });
});
