import { describe, expect, it } from 'vitest';
import type { Feedback } from '../../src/engine';
import { deriveQuestions } from '../../src/ui/screens/questionList';
import type { ChatItem } from '../../src/ui/useInterview';

const fb = { contentRelevance: { tier: 'high' } } as unknown as Feedback;
const qn = (id: number, text: string): ChatItem => ({ id, from: 'coach', kind: 'question', text });
const feed = (id: number): ChatItem => ({ id, from: 'coach', kind: 'feedback', text: '', feedback: fb });

describe('deriveQuestions (display folding)', () => {
  it('marks answered, skipped and current', () => {
    const rows = deriveQuestions([qn(1, 'A'), feed(2), qn(3, 'B'), qn(4, 'C')]);
    expect(rows.map((r) => r.state)).toEqual(['answered', 'skipped', 'current']);
    expect(rows[0]?.tier).toBe('high');
  });
  it('does not duplicate a repeated question', () => {
    expect(deriveQuestions([qn(1, 'A'), qn(2, 'A')])).toHaveLength(1);
  });
  it('ends the current question as skipped when the session summary arrives', () => {
    const rows = deriveQuestions([qn(1, 'A'), { id: 2, from: 'coach', kind: 'summary', text: '' }]);
    expect(rows[0]?.state).toBe('skipped');
  });
});
