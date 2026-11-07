import { describe, expect, it } from 'vitest';
import { blendConfidence, buildFeedback } from '../../src/engine/feedback/build';
import { evalOf } from '../helpers/fakes';

describe('buildFeedback', () => {
  it('drops demoralising text and guarantees an improvement and a strength', () => {
    const fb = buildFeedback(evalOf({ feedback: { headline: '', strengths: ['That was terrible'], improvements: ['You are stupid'], suggestedAnswerHint: 'awful' } }), 'low', 0);
    expect(fb.recommendations.length).toBeGreaterThan(0);
    expect(fb.strengths.length).toBeGreaterThan(0);
    expect(JSON.stringify(fb)).not.toMatch(/terrible|stupid|awful/i);
    expect(fb.hint).toBe('');
  });
  it('maps tier to canned fallback text when the model gives no comment', () => {
    const noComment = evalOf({ relevance: { score: 0.8, comment: '', missingPoints: [] } });
    expect(buildFeedback(noComment, 'high', 0.5).contentRelevance.text).toMatch(/main points/);
    expect(buildFeedback(noComment, 'low', 0.5).contentRelevance.text).toMatch(/did not yet cover/);
  });
  it('blends vader within [0,1]', () => {
    expect(blendConfidence(1, 1)).toBeCloseTo(1); expect(blendConfidence(0, -1)).toBeCloseTo(0); expect(blendConfidence(0.5, 0)).toBeCloseTo(0.5);
    expect(blendConfidence(0.5, 99)).toBeLessThanOrEqual(1);
  });
});

describe('model-written, answer-specific text', () => {
  it('uses the model headline, understanding, relevance comment and clarity notes when present', () => {
    const ev = evalOf({
      understanding: 'You chose the course because it was affordable and you want a stable career.',
      relevance: { score: 0.55, comment: 'You were upfront that cost shaped your choice.', missingPoints: [] },
      clarity: { score: 0.8, notes: 'Your reason was easy to follow.' },
      feedback: { headline: 'An honest start.', strengths: ['Honest'], improvements: ['Link it to a goal'], suggestedAnswerHint: 'Name one skill you gained.' },
    });
    const fb = buildFeedback(ev, 'moderate', 0);
    expect(fb.headline).toBe('An honest start.');
    expect(fb.understood).toContain('affordable');
    expect(fb.contentRelevance.text).toBe('You were upfront that cost shaped your choice.');
    expect(fb.communicationClarity.text).toBe('Your reason was easy to follow.');
  });

  it('falls back to the safe canned wording when the model text is empty', () => {
    const ev = evalOf({ relevance: { score: 0.2, comment: '', missingPoints: [] }, clarity: { score: 0.8, notes: '' } });
    const fb = buildFeedback(ev, 'low', 0);
    expect(fb.contentRelevance.text.length).toBeGreaterThan(10);
    expect(fb.communicationClarity.text.length).toBeGreaterThan(10);
  });

  it('drops model prose that contains banned wording', () => {
    const ev = evalOf({
      understanding: 'This is a terrible answer.',
      relevance: { score: 0.4, comment: 'That was stupid.', missingPoints: [] },
      feedback: { headline: 'Awful.', strengths: ['ok'], improvements: ['x'], suggestedAnswerHint: '' },
    });
    const fb = buildFeedback(ev, 'low', 0);
    expect(fb.headline).toBe('');
    expect(fb.understood).toBe('');
    expect(fb.contentRelevance.text).not.toMatch(/stupid/i);
  });
});

describe('dialect fairness guard', () => {
  const nag = 'Consider polishing your delivery into standard professional phrasing during formal interviews.';
  const base = { headline: 'h', strengths: ['Clear example'], suggestedAnswerHint: 'Use standard English phrasing.' };

  it('removes dialect/standard-English advice when the meaning was clear, keeping real improvements', () => {
    const ev = evalOf({ clarity: { score: 0.85, notes: 'clear' }, feedback: { ...base, improvements: [nag, 'Say what you learned from the project.'] } });
    const fb = buildFeedback(ev, 'high', 0);
    expect(fb.recommendations).toEqual(['Say what you learned from the project.']);
    expect(fb.hint).toBe('');
  });

  it('still guarantees one improvement if every suggestion was removed', () => {
    const ev = evalOf({ clarity: { score: 0.9, notes: '' }, feedback: { ...base, improvements: [nag] } });
    expect(buildFeedback(ev, 'high', 0).recommendations.length).toBe(1);
    expect(buildFeedback(ev, 'high', 0).recommendations[0]).not.toMatch(/standard/i);
  });

  it('keeps language advice when the meaning genuinely was unclear', () => {
    const ev = evalOf({ clarity: { score: 0.3, notes: 'hard to follow' }, feedback: { ...base, improvements: [nag] } });
    expect(buildFeedback(ev, 'low', 0).recommendations).toEqual([nag]);
  });
});
