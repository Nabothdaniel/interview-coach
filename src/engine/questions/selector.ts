import type { Difficulty, Question } from '../types';

/** Choose the next unasked question closest to the target difficulty; ties broken by rng, ids sorted first for determinism under a seeded rng. */
export function pickNext(
  pool: readonly Question[],
  asked: ReadonlySet<string>,
  target: Difficulty,
  rng: () => number = Math.random,
): Question | null {
  const candidates = pool.filter((q) => !asked.has(q.id));
  if (candidates.length === 0) return null;
  const best = Math.min(...candidates.map((q) => Math.abs(q.difficulty - target)));
  const tied = candidates.filter((q) => Math.abs(q.difficulty - target) === best).sort((a, b) => a.id.localeCompare(b.id));
  const idx = Math.min(tied.length - 1, Math.floor(rng() * tied.length));
  return tied[idx] ?? null;
}

/** Adaptive difficulty (ZPD, thesis §2.2): up after a high-relevance answer, down after a low one. */
export function adjustDifficulty(current: Difficulty, relevance: number): Difficulty {
  if (relevance >= 0.75) return Math.min(3, current + 1) as Difficulty;
  if (relevance < 0.5) return Math.max(1, current - 1) as Difficulty;
  return current;
}
