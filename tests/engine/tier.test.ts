import { describe, expect, it } from 'vitest';
import { relevanceTier } from '../../src/engine/evaluator/tier';

describe('relevanceTier (thesis §3.3.3 thresholds)', () => {
  it.each([
    [1, 'high'],
    [0.75, 'high'],
    [0.7499, 'moderate'],
    [0.5, 'moderate'],
    [0.4999, 'low'],
    [0, 'low'],
  ] as const)('score %s -> %s', (score, tier) => {
    expect(relevanceTier(score)).toBe(tier);
  });

  it.each([-0.01, 1.01, NaN, Infinity])('rejects out-of-range %s', (bad) => {
    expect(() => relevanceTier(bad)).toThrow(RangeError);
  });
});
