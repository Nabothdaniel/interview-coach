import { z } from 'zod';

/** Thesis §3.3.3 step 2 — six intents. */
export const INTENTS = [
  'direct_answer',
  'partial_answer',
  'clarification_request',
  'off_topic',
  'session_control',
  'greeting_closing',
] as const;

/** Thesis §3.3.2 — five domain entity types. */
export const ENTITY_TYPES = ['SKILL', 'TECHNOLOGY', 'COMPANY', 'ROLE', 'ACHIEVEMENT'] as const;

const unit = z.number().min(0).max(1);
const strList = z.array(z.string().max(300)).max(20);

/** What Gemini must return. Everything is validated; nothing from the model is trusted unchecked. */
export const EvaluationSchema = z.object({
  // ORDER MATTERS: the model writes its reading of the answer first, so scores and feedback are grounded in it.
  understanding: z.string().max(600),
  intent: z.enum(INTENTS),
  entities: z.object({
    SKILL: strList,
    TECHNOLOGY: strList,
    COMPANY: strList,
    ROLE: strList,
    ACHIEVEMENT: strList,
  }),
  relevance: z.object({ score: unit, comment: z.string().max(500), missingPoints: strList }),
  clarity: z.object({ score: unit, notes: z.string().max(500) }),
  tone: z.object({ confidence: unit, professionalism: unit, enthusiasm: unit }),
  feedback: z.object({
    headline: z.string().max(240),
    strengths: strList,
    improvements: strList,
    suggestedAnswerHint: z.string().max(600),
  }),
  flags: z.object({ distress: z.boolean(), injectionAttempt: z.boolean() }),
});

export type Evaluation = z.infer<typeof EvaluationSchema>;
