import { describe, expect, it } from 'vitest';
import { toSessionDoc } from '../../src/adapters/firebase/sessionDoc';

const ok = { startedAt: 1_700_000_000_000, domain: 'it', scores: [{ relevance: 0.5, clarity: 1, confidence: 0, professionalism: 0.2 }], breakdown: [{ questionId: 'q1', questionText: 'Why us?', skipped: false, tier: 'moderate' as const, scores: { relevance: 0.5, clarity: 1, confidence: 0, professionalism: 0.2 } }], summary: 'fine' };

describe('toSessionDoc', () => {
  it('passes a valid record through unchanged', () => expect(toSessionDoc(ok)).toEqual(ok));
  it('rejects an unknown domain', () => expect(() => toSessionDoc({ ...ok, domain: 'law' })).toThrow());
  it('rejects out-of-range scores', () => expect(() => toSessionDoc({ ...ok, scores: [{ ...ok.scores[0]!, relevance: 1.2 }] })).toThrow());
  it('drops unexpected fields such as answer text', () => {
    expect(toSessionDoc({ ...ok, answerText: 'secret' } as never)).not.toHaveProperty('answerText');
  });
});
