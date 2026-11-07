import type { DIFFICULTIES, DOMAINS, LEVELS } from './config';
import type { RelevanceTier } from './evaluator/tier';

export type Domain = (typeof DOMAINS)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];
export type Level = (typeof LEVELS)[number];

/** Who the candidate is preparing to be. Context for tailoring feedback; never changes scoring rules. */
export interface CandidateProfile { targetRole: string; level: Level }

export interface FourScores { relevance: number; clarity: number; confidence: number; professionalism: number }

/** One question in the post-session breakdown. `strength`/`improvement` are live-only (model prose is never persisted). */
export interface BreakdownRow {
  questionId: string;
  questionText: string;
  skipped: boolean;
  tier: RelevanceTier | null;
  scores: FourScores | null;
  strength: string | null;
  improvement: string | null;
}

export interface Question {
  id: string;
  domain: Domain;
  difficulty: Difficulty;
  text: string;
  benchmarkAnswer: string;
  keyPoints: string[];
  keywords: string[];
  /** False until a human (HR professional) has reviewed it. Never claim validation otherwise. */
  reviewed: boolean;
  source: string;
}

/** Dialogue states, ANALYSIS.md §3.1. Transitions are implemented in dialogue/ (not yet). */
export type SessionStatus =
  | 'IDLE'
  | 'DISCLOSURE'
  | 'DOMAIN_SELECT'
  | 'ASKING'
  | 'AWAITING_ANSWER'
  | 'EVALUATING'
  | 'FEEDBACK'
  | 'SUMMARY'
  | 'CLOSED';
