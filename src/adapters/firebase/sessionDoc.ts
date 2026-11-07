import { z } from 'zod';
import { DOMAINS } from '../../engine/config';
import type { SessionRecord } from '../../engine/ports';

const unit = z.number().min(0).max(1);
const four = z.object({ relevance: unit, clarity: unit, confidence: unit, professionalism: unit });

/**
 * Shape of a persisted session. Validated before every write (so a bad record fails locally, not at the rules engine) and on every read
 * (stored data is untrusted). Holds scores and question ids/text only: never answer text, never model prose.
 */
export const SessionDocSchema = z.object({
  startedAt: z.number().int().positive(),
  domain: z.enum(DOMAINS),
  scores: z.array(four).max(50),
  // `default([])` so sessions saved before the breakdown existed still load.
  breakdown: z.array(z.object({
    questionId: z.string().max(120),
    questionText: z.string().max(300),
    skipped: z.boolean(),
    tier: z.enum(['high', 'moderate', 'low']).nullable(),
    scores: four.nullable(),
  })).max(50).default([]),
  summary: z.string().max(4000),
});
export type StoredSession = z.infer<typeof SessionDocSchema>;

/** Returns a plain, validated object for `addDoc`; throws a ZodError on an invalid record. */
export function toSessionDoc(rec: SessionRecord): StoredSession {
  return SessionDocSchema.parse(rec);
}
