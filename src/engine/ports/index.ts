import type { BreakdownRow, FourScores, Question } from '../types';

/** Engine talks to the outside world only through these. Firebase and test fakes implement them. */
export interface LlmRequest {
  system: string;
  user: string;
  /** JSON schema the model must follow. */
  responseSchema: unknown;
  temperature: number;
  timeoutMs: number;
}

export interface LlmPort {
  /** Returns the raw text the model produced (expected JSON). Throws on transport/timeout errors. */
  generateJson(req: LlmRequest): Promise<string>;
}

export interface SessionRecord {
  startedAt: number;
  domain: string;
  scores: FourScores[];
  /** Per-question scores and tiers. No answer text and no model prose. */
  breakdown: Omit<BreakdownRow, 'strength' | 'improvement'>[];
  summary: string;
}

export interface StorePort {
  listQuestions(domain: string): Promise<Question[]>;
  /** Must be a no-op unless the user has opted in to saving progress. */
  saveSession(rec: SessionRecord): Promise<void>;
}

export interface ClockPort {
  now(): number;
}
