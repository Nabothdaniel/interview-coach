import { type Firestore, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { ProfileSchema } from '../../engine/profile';
import type { CandidateProfile } from '../../engine/types';
import { userDoc } from './paths';

interface UserFields { saveProgress?: boolean; targetRole?: string; level?: CandidateProfile['level'] }

/**
 * Updates the user document, creating it first if it does not exist. Rules require a NEW user doc to be created with saveProgress=false,
 * so turning saving ON for a brand-new user is create + update. Updating a missing doc surfaces as 'not-found' from the server but as
 * 'permission-denied' under our rules (there is no existing doc for the update rule to evaluate); a real denial then throws from setDoc.
 */
async function upsertUser(db: Firestore, uid: string, fields: UserFields): Promise<void> {
  const ref = userDoc(db, uid);
  try {
    await updateDoc(ref, { ...fields });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code !== 'not-found' && code !== 'permission-denied') throw e;
    const { saveProgress, ...rest } = fields;
    await setDoc(ref, { saveProgress: false, createdAt: serverTimestamp(), ...rest });
    if (saveProgress === true) await updateDoc(ref, { saveProgress: true });
  }
}

/** Writes the user's opt-in flag. Only called when the user flips the switch (never on load). */
export function writeSaveProgress(db: Firestore, uid: string, on: boolean): Promise<void> {
  return upsertUser(db, uid, { saveProgress: on });
}

/** Writes the onboarding profile (target role and level). Only called when the user saves it, and only if they opted in to saving. */
export function writeProfile(db: Firestore, uid: string, p: CandidateProfile): Promise<void> {
  return upsertUser(db, uid, { targetRole: p.targetRole, level: p.level });
}

export interface UserDocData { profile: CandidateProfile | null; saveProgress: boolean }

/** One read, used only when this browser has no local profile (new device or cleared storage). Null if there is no document. */
export async function readUserDoc(db: Firestore, uid: string): Promise<UserDocData | null> {
  const snap = await getDoc(userDoc(db, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  const profile = ProfileSchema.safeParse(data);
  return { profile: profile.success ? profile.data : null, saveProgress: data['saveProgress'] === true };
}
