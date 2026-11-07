import { browserLocalPersistence, sendPasswordResetEmail, browserSessionPersistence, createUserWithEmailAndPassword, getAuth, setPersistence, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseApp } from './runtime';

export type AuthMode = 'login' | 'register';
export interface Credentials { email: string; password: string; remember: boolean; mode: AuthMode }
export type AuthResult = { ok: true } | { ok: false; message: string };

/** Display-only wording. Deliberately vague for credential errors so we do not reveal which accounts exist. */
function friendly(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email': return 'That email or password did not work. Please check and try again.';
    case 'auth/email-already-in-use': return 'An account with this email already exists. Try logging in instead.';
    case 'auth/weak-password': return 'Choose a stronger password (at least 6 characters).';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed': return 'Network problem. Check your connection and try again.';
    default: return 'Something went wrong. Please try again.';
  }
}

export async function authenticate(c: Credentials): Promise<AuthResult> {
  const app = getFirebaseApp();
  if (app === null) return { ok: false, message: 'Firebase is not configured yet.' };
  const auth = getAuth(app);
  try {
    await setPersistence(auth, c.remember ? browserLocalPersistence : browserSessionPersistence);
    if (c.mode === 'register') await createUserWithEmailAndPassword(auth, c.email.trim(), c.password);
    else await signInWithEmailAndPassword(auth, c.email.trim(), c.password);
    return { ok: true };
  } catch (e) {
    const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
    return { ok: false, message: friendly(code) };
  }
}

/** Always reports success for well-formed addresses so the form cannot be used to discover which emails have accounts. */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const app = getFirebaseApp();
  if (app === null) return { ok: false, message: 'Firebase is not configured yet.' };
  try {
    await sendPasswordResetEmail(getAuth(app), email.trim());
  } catch (e) {
    const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
    if (code === 'auth/too-many-requests' || code === 'auth/network-request-failed') return { ok: false, message: friendly(code) };
  }
  return { ok: true };
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const passwordChecks = (pw: string): { length: boolean; mix: boolean } => ({ length: pw.length >= 8, mix: /[A-Za-z]/.test(pw) && /\d/.test(pw) });
