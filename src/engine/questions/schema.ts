import { z } from 'zod';
import { DIFFICULTIES, DOMAINS } from '../config';

/** AGENTS.md §5 question schema. The importer and the seed test both reject violations. */
export const QuestionSchema = z.object({
  id: z.string().min(1),
  domain: z.enum(DOMAINS),
  difficulty: z.union(DIFFICULTIES.map((d) => z.literal(d)) as [z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]),
  text: z.string().min(10),
  benchmarkAnswer: z.string().min(20),
  keyPoints: z.array(z.string().min(2)).min(2),
  keywords: z.array(z.string().min(2)).min(1),
  reviewed: z.boolean(),
  source: z.string().min(1),
});
