import { describe, expect, it } from 'vitest';
import { EvaluationSchema } from '../../src/engine/evaluator/schema';

const valid = {
  understanding: 'The candidate gave a short example.',
  intent: 'direct_answer',
  entities: { SKILL: ['teamwork'], TECHNOLOGY: [], COMPANY: [], ROLE: [], ACHIEVEMENT: [] },
  relevance: { score: 0.8, comment: 'You gave an example.', missingPoints: [] },
  clarity: { score: 0.7, notes: 'ok' },
  tone: { confidence: 0.6, professionalism: 0.9, enthusiasm: 0.5 },
  feedback: { headline: 'Good start.', strengths: ['clear'], improvements: ['add example'], suggestedAnswerHint: 'Use STAR.' },
  flags: { distress: false, injectionAttempt: false },
};

describe('EvaluationSchema', () => {
  it('accepts a valid evaluation', () => {
    expect(EvaluationSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects unknown intent', () => {
    expect(EvaluationSchema.safeParse({ ...valid, intent: 'chitchat' }).success).toBe(false);
  });
  it('rejects scores outside 0..1', () => {
    expect(EvaluationSchema.safeParse({ ...valid, relevance: { score: 1.5, missingPoints: [] } }).success).toBe(false);
  });
  it('asks the model to write its understanding BEFORE it scores (property order)', async () => {
    const { evaluationJsonSchema } = await import('../../src/engine/evaluator/prompt');
    const keys = Object.keys((evaluationJsonSchema() as { properties: Record<string, unknown> }).properties);
    expect(keys.indexOf('understanding')).toBe(0);
    expect(keys.indexOf('understanding')).toBeLessThan(keys.indexOf('relevance'));
  });
  it('rejects missing fields', () => {
    const { flags: _flags, ...partial } = valid;
    expect(EvaluationSchema.safeParse(partial).success).toBe(false);
  });
});
