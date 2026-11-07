import { VADER_CONFIDENCE_WEIGHT } from '../config';
import type { Evaluation } from '../evaluator/schema';
import type { RelevanceTier } from '../evaluator/tier';

export interface Feedback {
  /** The model's one-line reaction to this specific answer (empty if unavailable or filtered). */
  headline: string;
  /** What the model understood the candidate to say: shown so users can see their context was read. */
  understood: string;
  contentRelevance: { score: number; tier: RelevanceTier; text: string; missingPoints: string[] };
  communicationClarity: { score: number; text: string };
  confidenceTone: { confidence: number; professionalism: number; enthusiasm: number; vaderCompound: number };
  recommendations: string[];
  strengths: string[];
  hint: string;
}

const BANNED = /\b(terrible|stupid|idiot|awful|pathetic|useless|hopeless|worthless|dumb|garbage|trash)\b/i;
/** Model prose shown to users: trimmed, and dropped entirely if it contains banned wording. */
const cleanText = (s: string): string => { const t = s.trim(); return BANNED.test(t) ? '' : t; };
/** Fairness guard (AGENTS.md §6): dialect/non-standard-English "fixes" are removed when the meaning was clear. Deterministic, not left to the prompt. */
const DIALECT_NAG = /(pidgin|dialect|non-?standard|standard\s+(professional\s+|formal\s+)?(english|phrasing|grammar|language)|polish(ing)?\s+your\s+(delivery|language|english|phrasing)|more\s+formal\s+(language|phrasing|english))/i;
const CLEAR_MEANING_MIN = 0.6;
const clean = (xs: string[]): string[] => xs.map((s) => s.trim()).filter((s) => s.length > 0 && !BANNED.test(s));

const RELEVANCE_TEXT: Record<RelevanceTier, string> = {
  high: 'Your answer covered the main points the interviewer is looking for.',
  moderate: 'Your answer touched on some of the key points, but some important ones are missing.',
  low: 'Your answer did not yet cover the key points of this question. Try focusing directly on what is being asked.',
};

const clarityText = (s: number): string =>
  s >= 0.75 ? 'Your meaning came across clearly.' : s >= 0.5 ? 'Your meaning was mostly clear; tightening the structure would help.' : 'Parts of your meaning were hard to follow; try a clearer structure (situation, action, result).';

/** Blend the model's confidence cue with local VADER (thesis §3.3.3 step 5). Weight is a tunable heuristic. */
export function blendConfidence(modelConfidence: number, vaderCompound: number): number {
  const vader01 = (Math.max(-1, Math.min(1, vaderCompound)) + 1) / 2;
  return (1 - VADER_CONFIDENCE_WEIGHT) * modelConfidence + VADER_CONFIDENCE_WEIGHT * vader01;
}

export function buildFeedback(ev: Evaluation, tier: RelevanceTier, vaderCompound: number): Feedback {
  const strengths = clean(ev.feedback.strengths);
  const meaningClear = ev.clarity.score >= CLEAR_MEANING_MIN;
  const fair = (xs: string[]): string[] => (meaningClear ? xs.filter((x) => !DIALECT_NAG.test(x)) : xs);
  let recommendations = fair(clean(ev.feedback.improvements));
  if (recommendations.length === 0) recommendations = ['Add a specific example from your own experience to make your answer stronger.'];
  return {
    headline: cleanText(ev.feedback.headline),
    understood: cleanText(ev.understanding),
    contentRelevance: { score: ev.relevance.score, tier, text: cleanText(ev.relevance.comment) || RELEVANCE_TEXT[tier], missingPoints: clean(ev.relevance.missingPoints) },
    communicationClarity: { score: ev.clarity.score, text: cleanText(ev.clarity.notes) || clarityText(ev.clarity.score) },
    confidenceTone: {
      confidence: blendConfidence(ev.tone.confidence, vaderCompound),
      professionalism: ev.tone.professionalism,
      enthusiasm: ev.tone.enthusiasm,
      vaderCompound,
    },
    recommendations,
    strengths: strengths.length > 0 ? strengths : ['You made an attempt and gave us something to work with.'],
    hint: BANNED.test(ev.feedback.suggestedAnswerHint) || (meaningClear && DIALECT_NAG.test(ev.feedback.suggestedAnswerHint)) ? '' : ev.feedback.suggestedAnswerHint.trim(),
  };
}
