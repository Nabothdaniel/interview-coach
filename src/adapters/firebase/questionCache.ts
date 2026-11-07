import { z } from 'zod';
import { QuestionSchema } from '../../engine/questions/schema';
import type { Question } from '../../engine/types';

/** Minimal Storage surface so this is testable without a browser. */
export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void }
export interface CacheOpts { storage: KV | null; now: () => number; ttlMs: number }

const Entry = z.object({ t: z.number(), rows: z.array(QuestionSchema) });
const key = (domain: string): string => `ijipb:q:v1:${domain}`;

/** Fresh cached questions for a domain, or null (missing, stale, corrupt, or storage unavailable). */
export function readCachedQuestions(o: CacheOpts, domain: string): Question[] | null {
  try {
    const raw = o.storage?.getItem(key(domain));
    if (!raw) return null;
    const parsed = Entry.safeParse(JSON.parse(raw) as unknown);
    if (!parsed.success || o.now() - parsed.data.t > o.ttlMs) return null;
    return parsed.data.rows;
  } catch {
    return null;
  }
}

/** Caches the result INCLUDING an empty/fallback result, so an empty collection is not re-queried on every start. */
export function writeCachedQuestions(o: CacheOpts, domain: string, rows: readonly Question[]): void {
  try { o.storage?.setItem(key(domain), JSON.stringify({ t: o.now(), rows })); } catch { /* storage full or blocked: skip */ }
}
