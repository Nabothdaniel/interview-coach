import { describe, expect, it } from 'vitest';
import { GOLDEN } from './golden-set';

describe('golden set integrity', () => {
  it('has at least 20 cases with unique ids', () => {
    expect(GOLDEN.length).toBeGreaterThanOrEqual(20);
    expect(new Set(GOLDEN.map((g) => g.id)).size).toBe(GOLDEN.length);
  });
});
