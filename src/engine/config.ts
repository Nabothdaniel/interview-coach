/** Single source of truth for tunables. Model IDs verified against Firebase docs 2026-11-06; re-verify before deploy. */
// Verified 2026-11-07 with a live key: 3.5-flash-lite and 3.5-flash respond (direct API and Firebase AI Logic);
// 3.8-flash and 3.7-flash time out (>40s). Re-verify against the official model list before deploy.
export const MODEL_ID = 'gemini-3.5-flash-lite';
export const FALLBACK_MODEL_ID = 'gemini-3.5-flash';

export const EVAL_TEMPERATURE = 0.2;
// Live probe 2026-11-07: typical call 2.5-4 s, but occasional 10-17 s stalls. A short first-attempt timeout lets the single retry
// replace a stalled call (worst case ~2x this) instead of the user waiting out the stall.
export const LLM_TIMEOUT_MS = 8_000;
export const LLM_MAX_RETRIES = 1;
export const MAX_ANSWER_CHARS = 2_000;

/** Thesis §3.3.3 step 4. */
export const TIER_HIGH_MIN = 0.75;
export const TIER_MODERATE_MIN = 0.5;

/** Self-reported experience level collected at onboarding; context for feedback only. */
export const LEVELS = ['student', 'graduate', 'entry', 'experienced'] as const;
export const MAX_ROLE_CHARS = 60;

export const DOMAINS = ['it', 'business', 'graduate'] as const;
export const DIFFICULTIES = [1, 2, 3] as const;

/** Max questions per session (scored + skipped). */
export const DEFAULT_MAX_QUESTIONS = 5;
/** Starting difficulty: gentle, to keep early practice psychologically safe (AGENTS.md §6). */
export const START_DIFFICULTY = 1;
/** Heuristic (NOT from the thesis): weight of VADER compound when blending with the model's confidence cue. Tunable. */
export const VADER_CONFIDENCE_WEIGHT = 0.3;
