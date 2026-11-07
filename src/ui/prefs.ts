import { type CandidateProfile, type Domain, DOMAINS, EngineSnapshotSchema, type EngineSnapshot, ProfileSchema } from '../engine';

/** Browser-local preference + resume snapshot. Per-user keys. Every access is guarded (storage can be blocked). */
const k = (uid: string, what: string): string => `ijipb:${what}:v1:${uid}`;
const store = (): Storage | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };

export const browserStorage = store;

export function readSavePref(uid: string): boolean {
  try { return store()?.getItem(k(uid, 'save')) === '1'; } catch { return false; }
}
export function writeSavePref(uid: string, on: boolean): void {
  try { store()?.setItem(k(uid, 'save'), on ? '1' : '0'); } catch { /* ignore */ }
}
/** The user accepted the full AI disclosure once on this account (this browser). Later sessions show only the short notice. */
export function readDisclosureAck(uid: string): boolean {
  try { return store()?.getItem(k(uid, 'ack')) === '1'; } catch { return false; }
}
export function writeDisclosureAck(uid: string): void {
  try { store()?.setItem(k(uid, 'ack'), '1'); } catch { /* ignore */ }
}
/** Last practised domain, only to highlight it next time. Validated against the known domains. */
export function readLastDomain(uid: string): Domain | null {
  try { const v = store()?.getItem(k(uid, 'domain')); return (DOMAINS as readonly string[]).includes(v ?? '') ? (v as Domain) : null; } catch { return null; }
}
export function writeLastDomain(uid: string, d: Domain): void {
  try { store()?.setItem(k(uid, 'domain'), d); } catch { /* ignore */ }
}
export function readProfile(uid: string): CandidateProfile | null {
  try {
    const raw = store()?.getItem(k(uid, 'profile'));
    if (!raw) return null;
    const p = ProfileSchema.safeParse(JSON.parse(raw) as unknown);
    return p.success ? p.data : null;
  } catch { return null; }
}
export function writeProfile(uid: string, p: CandidateProfile): void {
  try { store()?.setItem(k(uid, 'profile'), JSON.stringify(p)); } catch { /* ignore */ }
}
export function readSnapshot(uid: string): EngineSnapshot | null {
  try {
    const raw = store()?.getItem(k(uid, 'snap'));
    if (!raw) return null;
    const p = EngineSnapshotSchema.safeParse(JSON.parse(raw) as unknown);
    return p.success ? p.data : null;
  } catch { return null; }
}
export function writeSnapshot(uid: string, snap: EngineSnapshot | null): void {
  try {
    if (snap === null) store()?.removeItem(k(uid, 'snap'));
    else store()?.setItem(k(uid, 'snap'), JSON.stringify(snap));
  } catch { /* ignore */ }
}
