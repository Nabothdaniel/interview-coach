import { beforeEach, describe, expect, it, vi } from 'vitest';
import { q } from '../helpers/fakes';

const getDocs = vi.fn();
const addDoc = vi.fn();
vi.mock('firebase/firestore', () => ({
  collection: (...a: unknown[]) => a.join('/'), query: (...a: unknown[]) => a, where: (...a: unknown[]) => a, limit: (n: number) => ({ limit: n }),
  getDocs: (...a: unknown[]) => getDocs(...a), addDoc: (...a: unknown[]) => addDoc(...a),
}));

import { createFirestoreStore, MAX_QUESTIONS_READ, MIN_WRITE_GAP_MS } from '../../src/adapters/firebase/store';
import { readCachedQuestions, writeCachedQuestions } from '../../src/adapters/firebase/questionCache';

const memStorage = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
const doc = (id: string) => { const { id: _i, ...rest } = q(id, 1, 'it'); return { id, data: () => ({ ...rest, benchmarkAnswer: 'A benchmark answer that is long enough to pass the schema.' }) }; };
const rec = (startedAt: number) => ({ startedAt, domain: 'it', scores: [], breakdown: [], summary: 's' });

let now = 1_000_000;
const make = (on = true, storage = memStorage()) =>
  createFirestoreStore({} as never, 'u1', () => on, { storage, now: () => now, ttlMs: 60_000 });

beforeEach(() => { getDocs.mockReset(); addDoc.mockReset(); now = 1_000_000; vi.useRealTimers(); });

describe('Firestore read budget', () => {
  it('reads a domain once, however many times it is requested', async () => {
    getDocs.mockResolvedValue({ docs: [doc('a'), doc('b')] });
    const s = make();
    await s.listQuestions('it'); await s.listQuestions('it'); await s.listQuestions('it');
    expect(getDocs).toHaveBeenCalledTimes(1);
  });

  it('dedupes concurrent requests for the same domain', async () => {
    getDocs.mockResolvedValue({ docs: [doc('a')] });
    const s = make();
    await Promise.all([s.listQuestions('it'), s.listQuestions('it')]);
    expect(getDocs).toHaveBeenCalledTimes(1);
  });

  it('survives a page reload: a new store with the same storage does not re-read', async () => {
    getDocs.mockResolvedValue({ docs: [doc('a')] });
    const storage = memStorage();
    await make(true, storage).listQuestions('it');
    await make(true, storage).listQuestions('it'); // "reload"
    expect(getDocs).toHaveBeenCalledTimes(1);
  });

  it('caches an EMPTY collection too (falls back to the seed bank, no repeated queries)', async () => {
    getDocs.mockResolvedValue({ docs: [] });
    const storage = memStorage();
    const first = await make(true, storage).listQuestions('it');
    expect(first.length).toBeGreaterThan(0);
    await make(true, storage).listQuestions('it');
    expect(getDocs).toHaveBeenCalledTimes(1);
  });

  it('caches the fallback after an error too', async () => {
    getDocs.mockRejectedValue(new Error('offline'));
    const storage = memStorage();
    await make(true, storage).listQuestions('it');
    await make(true, storage).listQuestions('it');
    expect(getDocs).toHaveBeenCalledTimes(1);
  });

  it('re-reads only after the TTL expires', async () => {
    getDocs.mockResolvedValue({ docs: [doc('a')] });
    const storage = memStorage();
    await make(true, storage).listQuestions('it');
    now += 60_001;
    await make(true, storage).listQuestions('it');
    expect(getDocs).toHaveBeenCalledTimes(2);
  });

  it('caps the query size', async () => {
    getDocs.mockResolvedValue({ docs: [] });
    await make().listQuestions('it');
    const args = getDocs.mock.calls[0]?.[0] as unknown[];
    expect(JSON.stringify(args)).toContain(`"limit":${MAX_QUESTIONS_READ}`);
  });

  it('drops schema-invalid Firestore documents and falls back to the seed bank when none are valid', async () => {
    getDocs.mockResolvedValue({ docs: [{ id: 'bad', data: () => ({ domain: 'it', text: 'x' }) }] });
    const rows = await make().listQuestions('it');
    expect(rows.every((r) => r.source === 'seed-v1')).toBe(true);
  });

  it('ignores corrupt or tampered cache entries', () => {
    const storage = memStorage();
    storage.setItem('ijipb:q:v1:it', '{"t":1,"rows":[{"nope":true}]}');
    expect(readCachedQuestions({ storage, now: () => 1, ttlMs: 10 }, 'it')).toBeNull();
    storage.setItem('ijipb:q:v1:it', 'not json');
    expect(readCachedQuestions({ storage, now: () => 1, ttlMs: 10 }, 'it')).toBeNull();
    writeCachedQuestions({ storage: null, now: () => 1, ttlMs: 10 }, 'it', []); // no storage: no throw
  });
});

describe('Firestore write budget', () => {
  it('writes nothing when saving is off', async () => {
    await make(false).saveSession(rec(1));
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('writes a session once, even if asked twice', async () => {
    const s = make(true);
    await s.saveSession(rec(1)); await s.saveSession(rec(1));
    expect(addDoc).toHaveBeenCalledTimes(1);
  });

  it('rate-limits back-to-back writes', async () => {
    vi.useFakeTimers(); vi.setSystemTime(1_000_000);
    const s = make(true);
    await s.saveSession(rec(1));
    await s.saveSession(rec(2));
    expect(addDoc).toHaveBeenCalledTimes(1);
    vi.setSystemTime(1_000_000 + MIN_WRITE_GAP_MS + 1);
    await s.saveSession(rec(3));
    expect(addDoc).toHaveBeenCalledTimes(2);
  });
});

describe('invalid session record', () => {
  it('is rejected before any write and does not consume the rate guard', async () => {
    const s = make();
    await expect(s.saveSession({ ...rec(1), domain: 'astrology' })).rejects.toThrow();
    expect(addDoc).not.toHaveBeenCalled();
    addDoc.mockResolvedValue(undefined);
    await s.saveSession(rec(2));
    expect(addDoc).toHaveBeenCalledTimes(1);
  });
});
