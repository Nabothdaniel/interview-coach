import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateDoc = vi.fn();
const setDoc = vi.fn();
vi.mock('firebase/firestore', () => ({
  doc: (...a: unknown[]) => a.join('/'), serverTimestamp: () => 'TS',
  updateDoc: (...a: unknown[]) => updateDoc(...a), setDoc: (...a: unknown[]) => setDoc(...a),
}));
import { writeSaveProgress } from '../../src/adapters/firebase/progress';

const err = (code: string) => Object.assign(new Error(code), { code });
beforeEach(() => { updateDoc.mockReset(); setDoc.mockReset(); });

describe('writeSaveProgress', () => {
  it('existing user: one update', async () => {
    updateDoc.mockResolvedValue(undefined);
    await writeSaveProgress({} as never, 'u1', true);
    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(setDoc).not.toHaveBeenCalled();
  });

  for (const code of ['not-found', 'permission-denied']) {
    it(`new user (${code}): creates with saveProgress=false, then flips on`, async () => {
      updateDoc.mockRejectedValueOnce(err(code)).mockResolvedValue(undefined);
      setDoc.mockResolvedValue(undefined);
      await writeSaveProgress({} as never, 'u1', true);
      expect(setDoc.mock.calls[0]?.[1]).toEqual({ saveProgress: false, createdAt: 'TS' });
      expect(updateDoc).toHaveBeenCalledTimes(2);
    });
  }

  it('new user turning OFF creates the doc only (no pointless second write)', async () => {
    updateDoc.mockRejectedValueOnce(err('not-found'));
    setDoc.mockResolvedValue(undefined);
    await writeSaveProgress({} as never, 'u1', false);
    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(setDoc).toHaveBeenCalledTimes(1);
  });

  it('a genuine denial surfaces (rules not deployed): throws instead of pretending', async () => {
    updateDoc.mockRejectedValue(err('permission-denied'));
    setDoc.mockRejectedValue(err('permission-denied'));
    await expect(writeSaveProgress({} as never, 'u1', true)).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('network errors are not retried as a create', async () => {
    updateDoc.mockRejectedValue(err('unavailable'));
    await expect(writeSaveProgress({} as never, 'u1', true)).rejects.toMatchObject({ code: 'unavailable' });
    expect(setDoc).not.toHaveBeenCalled();
  });
});
