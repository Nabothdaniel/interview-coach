import { TIER_HIGH_MIN, TIER_MODERATE_MIN } from '../config';

export type RelevanceTier = 'high' | 'moderate' | 'low';

/**
 * Deterministic tier per thesis §3.3.3: High >= 0.75, Moderate 0.50–0.74, Low < 0.50.
 * The model's own tier (if any) is ignored; only the numeric score is used.
 */
export function relevanceTier(score: number): RelevanceTier {
  if (!Number.isFinite(score) || score < 0 || score > 1) {
    throw new RangeError(`relevance score out of range: ${score}`);
  }
  if (score >= TIER_HIGH_MIN) return 'high';
  if (score >= TIER_MODERATE_MIN) return 'moderate';
  return 'low';
}
