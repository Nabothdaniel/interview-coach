import type { Firestore } from 'firebase/firestore';
import { addDoc, getDocs, limit, query, where } from 'firebase/firestore';
import type { SessionRecord, StorePort } from '../../engine/ports';
import { QuestionSchema } from '../../engine/questions/schema';
import { SEED_QUESTIONS } from '../../engine/questions/seed';
import type { Question } from '../../engine/types';
import { questionsCol, sessionsCol } from './paths';
import { toSessionDoc } from './sessionDoc';
import { type CacheOpts, readCachedQuestions, writeCachedQuestions } from './questionCache';

/** Hard caps that keep Firestore usage predictable on the free tier. */
export const MAX_QUESTIONS_READ = 50;
export const MIN_WRITE_GAP_MS = 10_000;

/**
 * Firestore-backed store. Budget per user:
 *  - reads: at most ONE query (<= MAX_QUESTIONS_READ docs) per domain per cache TTL, shared across reloads via storage. Empty results are cached too.
 *  - writes: at most ONE session document per finished session, only when the user opted in (rules also enforce this).
 */
export function createFirestoreStore(db: Firestore, uid: string, isSaveProgressOn: () => boolean, cache: CacheOpts): StorePort {
  const memory = new Map<string, Question[]>();
  const inflight = new Map<string, Promise<Question[]>>();
  const saved = new Set<number>();
  let lastWriteAt = 0;

  async function fetchDomain(domain: string): Promise<Question[]> {
    const seed = SEED_QUESTIONS.filter((q) => q.domain === domain);
    let rows: Question[];
    try {
      const snap = await getDocs(query(questionsCol(db), where('domain', '==', domain), limit(MAX_QUESTIONS_READ)));
      // Schema-invalid documents are dropped (AGENTS.md §5): they never reach the engine or the cache.
      const fromDb = snap.docs.flatMap((d) => {
        const parsed = QuestionSchema.safeParse({ ...d.data(), id: d.id });
        return parsed.success ? [parsed.data as Question] : [];
      });
      rows = fromDb.length > 0 ? fromDb : seed;
    } catch {
      rows = seed; // collection missing or unreachable: use the bundled starter bank
    }
    writeCachedQuestions(cache, domain, rows);
    return rows;
  }

  return {
    async listQuestions(domain: string): Promise<Question[]> {
      const hit = memory.get(domain) ?? readCachedQuestions(cache, domain);
      if (hit) { memory.set(domain, hit); return hit; }
      let p = inflight.get(domain);
      if (!p) {
        p = fetchDomain(domain).then((r) => { memory.set(domain, r); return r; }).finally(() => inflight.delete(domain));
        inflight.set(domain, p);
      }
      return p;
    },
    async saveSession(rec: SessionRecord): Promise<void> {
      if (!isSaveProgressOn()) return;
      const doc = toSessionDoc(rec); // validate first so an invalid record never burns the rate-guard slot
      if (saved.has(rec.startedAt)) return; // never write the same session twice
      if (Date.now() - lastWriteAt < MIN_WRITE_GAP_MS) return; // hard rate guard
      saved.add(rec.startedAt);
      lastWriteAt = Date.now();
      await addDoc(sessionsCol(db, uid), doc);
    },
  };
}
