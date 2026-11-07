import { type Firestore, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { sessionsCol } from './paths';
import { SessionDocSchema, type StoredSession } from './sessionDoc';

export const HISTORY_LIMIT = 20;

/** The user's most recent saved sessions, newest first. One query; schema-invalid documents are dropped. */
export async function listSessions(db: Firestore, uid: string, n: number = HISTORY_LIMIT): Promise<StoredSession[]> {
  const snap = await getDocs(query(sessionsCol(db, uid), orderBy('startedAt', 'desc'), limit(n)));
  return snap.docs.flatMap((d) => {
    const parsed = SessionDocSchema.safeParse(d.data());
    return parsed.success ? [parsed.data] : [];
  });
}
