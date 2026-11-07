import { beforeEach, describe, expect, it, vi } from 'vitest';

const getDocs = vi.fn(); const getDoc = vi.fn(); const updateDoc = vi.fn(); const setDoc = vi.fn(); const orderBy = vi.fn((...a: unknown[]) => ({ orderBy: a }));
vi.mock('firebase/firestore', () => ({
  collection: (...a: unknown[]) => a.join('/'), doc: (...a: unknown[]) => a.join('/'), query: (...a: unknown[]) => a, limit: (n: number) => ({ limit: n }),
  orderBy: (...a: unknown[]) => orderBy(...a), serverTimestamp: () => 'TS',
  getDocs: (...a: unknown[]) => getDocs(...a), getDoc: (...a: unknown[]) => getDoc(...a),
  updateDoc: (...a: unknown[]) => updateDoc(...a), setDoc: (...a: unknown[]) => setDoc(...a),
}));
import { listSessions } from '../../src/adapters/firebase/history';
import { readUserDoc, writeProfile } from '../../src/adapters/firebase/progress';

const good = { startedAt: 1700000000000, domain: 'it', scores: [], summary: 's' }; // an old session saved before breakdown existed
beforeEach(() => { for (const m of [getDocs, getDoc, updateDoc, setDoc]) m.mockReset(); orderBy.mockClear(); });

describe('listSessions', () => {
  it('queries newest first, loads old sessions without a breakdown, and drops invalid documents', async () => {
    getDocs.mockResolvedValue({ docs: [{ data: () => good }, { data: () => ({ ...good, domain: 'law' }) }, { data: () => ({ nope: 1 }) }] });
    const out = await listSessions({} as never, 'u1');
    expect(orderBy).toHaveBeenCalledWith('startedAt', 'desc');
    expect(out).toHaveLength(1);
    expect(out[0]?.breakdown).toEqual([]);
  });
});

describe('profile persistence', () => {
  const p = { targetRole: 'Junior accountant', level: 'graduate' as const };
  it('existing user: a single update with only the profile fields', async () => {
    updateDoc.mockResolvedValue(undefined);
    await writeProfile({} as never, 'u1', p);
    expect(updateDoc).toHaveBeenCalledWith(expect.stringContaining('users/u1'), { targetRole: p.targetRole, level: p.level });
    expect(setDoc).not.toHaveBeenCalled();
  });
  it('new user: creates the doc with saveProgress=false plus the profile', async () => {
    updateDoc.mockRejectedValue(Object.assign(new Error('x'), { code: 'permission-denied' }));
    setDoc.mockResolvedValue(undefined);
    await writeProfile({} as never, 'u1', p);
    expect(setDoc).toHaveBeenCalledWith(expect.stringContaining('users/u1'), { saveProgress: false, createdAt: 'TS', targetRole: p.targetRole, level: p.level });
  });
  it('other errors are not swallowed', async () => {
    updateDoc.mockRejectedValue(Object.assign(new Error('x'), { code: 'unavailable' }));
    await expect(writeProfile({} as never, 'u1', p)).rejects.toThrow();
  });
  it('readUserDoc returns null for no document, and drops an invalid profile', async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    expect(await readUserDoc({} as never, 'u1')).toBeNull();
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ saveProgress: true, targetRole: 'x', level: 'wizard' }) });
    expect(await readUserDoc({} as never, 'u1')).toEqual({ profile: null, saveProgress: true });
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ saveProgress: false, ...p }) });
    expect(await readUserDoc({} as never, 'u1')).toEqual({ profile: p, saveProgress: false });
  });
});
