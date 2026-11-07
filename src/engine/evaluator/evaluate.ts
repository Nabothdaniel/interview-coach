import { EVAL_TEMPERATURE, LLM_MAX_RETRIES, LLM_TIMEOUT_MS } from '../config';
import type { LlmPort } from '../ports';
import { detectInjectionLocal } from '../safety/guard';
import type { CandidateProfile, Question } from '../types';
import { buildUserPrompt, evaluationJsonSchema, SYSTEM_PROMPT } from './prompt';
import { type Evaluation, EvaluationSchema } from './schema';
import { type RelevanceTier, relevanceTier } from './tier';

export type EvaluationOutcome =
  | { ok: true; evaluation: Evaluation; tier: RelevanceTier; injectionSuspected: boolean; attempts: number }
  | { ok: false; reason: 'llm_error' | 'invalid_output'; attempts: number; /** Error message only, never user text. For diagnostics. */ detail?: string };

/** Score cap applied when manipulation is suspected (local pattern OR model flag). Defensive, deterministic. */
export const INJECTION_RELEVANCE_CAP = 0.4;

/** Extract JSON from model text, tolerating ```json fences. Returns undefined if unparseable. */
export function parseModelJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return undefined;
  }
}

export async function evaluateAnswer(llm: LlmPort, q: Question, answerText: string, profile?: CandidateProfile | null): Promise<EvaluationOutcome> {
  const schema = evaluationJsonSchema();
  const user = buildUserPrompt(q, answerText, profile);
  const total = 1 + LLM_MAX_RETRIES;
  let lastReason: 'llm_error' | 'invalid_output' = 'llm_error';
  let detail = '';

  for (let attempt = 1; attempt <= total; attempt++) {
    let raw: string;
    try {
      raw = await llm.generateJson({ system: SYSTEM_PROMPT, user, responseSchema: schema, temperature: EVAL_TEMPERATURE, timeoutMs: LLM_TIMEOUT_MS });
    } catch (e) {
      lastReason = 'llm_error';
      detail = (e instanceof Error ? e.message : 'unknown error').slice(0, 200);
      continue;
    }
    const parsed = EvaluationSchema.safeParse(parseModelJson(raw));
    if (!parsed.success) {
      lastReason = 'invalid_output';
      detail = parsed.error.issues.slice(0, 2).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ').slice(0, 200);
      continue;
    }
    const ev = parsed.data;
    const injectionSuspected = detectInjectionLocal(answerText) || ev.flags.injectionAttempt;
    const relevance = injectionSuspected ? { ...ev.relevance, score: Math.min(ev.relevance.score, INJECTION_RELEVANCE_CAP) } : ev.relevance;
    const evaluation: Evaluation = { ...ev, relevance };
    return { ok: true, evaluation, tier: relevanceTier(relevance.score), injectionSuspected, attempts: attempt };
  }
  return { ok: false, reason: lastReason, attempts: total, ...(detail ? { detail } : {}) };
}
