import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { listSessions } from '../adapters/firebase/history';
import { readUserDoc, writeProfile as writeProfileRemote, writeSaveProgress } from '../adapters/firebase/progress';
import type { StoredSession } from '../adapters/firebase/sessionDoc';
import { createFirestoreStore } from '../adapters/firebase/store';
import type { CandidateProfile, ClockPort, Domain, EngineSnapshot, LlmPort, StorePort } from '../engine';
import { browserStorage, readDisclosureAck, readLastDomain, readProfile, readSavePref, readSnapshot, writeDisclosureAck, writeLastDomain, writeProfile, writeSavePref, writeSnapshot } from './prefs';

export type RuntimeState =
  | { kind: 'unconfigured' }
  | { kind: 'needs_signin' }
  | { kind: 'ready'; email: string | null; llm: LlmPort; store: StorePort; clock: ClockPort; progress: ProgressControl;
      /** True when this device had no local profile AND the account lookup failed, so we cannot tell a new user from a returning one. */
      lookupFailed: boolean;
      /** Starts downloading the AI SDK chunk (once). Called when a question is on screen, so it is ready by the time an answer is sent. */
      warmLlm: () => void;
      /** Gemini speech-to-text for browsers without built-in recognition. Loads the AI chunk on first use. */
      transcribe: (audio: Blob, mimeType: string) => Promise<string> };

/** Opt-in progress saving (default OFF) and the local resume snapshot (no answer text). */
export interface ProgressControl {
  isOn(): boolean;
  /** Writes Firestore only on an actual change. Throws if the server refuses (e.g. rules not deployed). */
  setOn(on: boolean): Promise<void>;
  loadSnapshot(): EngineSnapshot | null;
  saveSnapshot(s: EngineSnapshot | null): void;
  /** Full AI disclosure accepted once on this account; later sessions show the short notice only. */
  disclosureAcked(): boolean;
  ackDisclosure(): void;
  lastDomain(): Domain | null;
  setLastDomain(d: Domain): void;
  /** Onboarding answers. Null until the user completes onboarding. */
  profile(): CandidateProfile | null;
  /** Always stored on this device; also written to the account when saving is ON. */
  saveProfile(p: CandidateProfile): Promise<void>;
  /** The user's saved sessions, newest first (one Firestore query). Empty when nothing was ever saved. */
  history(): Promise<StoredSession[]>;
}

/** Public web config only (safe in the bundle). Static `process.env.NEXT_PUBLIC_*` references so Next can inline them. */
function readConfig() {
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  return Object.values(cfg).every((v) => typeof v === 'string' && v !== '') ? (cfg as Record<keyof typeof cfg, string>) : null;
}

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

/** Initialises Firebase (and App Check) once. Returns null when the public config is missing. */
export function getFirebaseApp(): FirebaseApp | null {
  const cfg = readConfig();
  if (cfg === null) return null;
  const existing = getApps()[0];
  if (existing) return existing;
  const app = initializeApp(cfg);
  const siteKey = process.env.NEXT_PUBLIC_APPCHECK_SITE_KEY;
  if (siteKey) {
    // The debug token flag is honoured only outside production builds, so a stray env value can never weaken a deployed app.
    if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_APPCHECK_DEBUG === 'true') (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(siteKey), isTokenAutoRefreshEnabled: true });
  }
  return app;
}

/**
 * The AI SDK is the heaviest import and is not needed to render any screen, so it loads in a separate chunk, only once a question is
 * on screen (`warm`), and is awaited on first use if the user answers faster than it arrives. Opening the app, onboarding or history never fetches it.
 */
function createLazyLlm(app: FirebaseApp): { llm: LlmPort; warm: () => void } {
  let loaded: Promise<LlmPort> | null = null;
  const load = (): Promise<LlmPort> => {
    loaded ??= import('../adapters/firebase/llm').then((m) => m.createFirebaseLlm(app)).catch((e: unknown) => { loaded = null; throw e; });
    return loaded;
  };
  return { llm: { generateJson: async (req) => (await load()).generateJson(req) }, warm: () => { void load().catch(() => undefined); } };
}

let loading: Promise<RuntimeState> | null = null;
/** One load at a time: a second call while one is running (e.g. React dev double-effects) reuses it instead of repeating the work. */
export function loadRuntime(): Promise<RuntimeState> {
  loading ??= buildRuntime().finally(() => { loading = null; });
  return loading;
}

async function buildRuntime(): Promise<RuntimeState> {
  const app = getFirebaseApp();
  if (app === null) return { kind: 'unconfigured' };
  const auth = getAuth(app);
  await auth.authStateReady();
  if (auth.currentUser === null) return { kind: 'needs_signin' };
  const uid = auth.currentUser.uid;
  const db = getFirestore(app);
  let on = readSavePref(uid); // default OFF (AGENTS.md §6)
  let profile = readProfile(uid);
  let lookupFailed = false;
  if (profile === null) {
    // New browser or cleared storage: ONE read of the user's own document so a returning user is not sent through onboarding again.
    try {
      const remote = await readUserDoc(db, uid);
      if (remote?.saveProgress) { on = true; writeSavePref(uid, true); }
      if (remote?.profile) { profile = remote.profile; writeProfile(uid, profile); }
    } catch (e) {
      lookupFailed = true; // offline, App Check refused, or rules: do not silently treat a returning user as new
      console.warn('Account lookup failed:', (e as { code?: string }).code ?? 'unknown');
    }
  }
  const progress: ProgressControl = {
    isOn: () => on,
    async setOn(next) {
      if (next === on) return;
      await writeSaveProgress(db, uid, next); // throws first, so the local flag only flips if the server accepted
      on = next;
      writeSavePref(uid, next);
      if (!next) writeSnapshot(uid, null);
      if (next && profile !== null) await writeProfileRemote(db, uid, profile); // throws so the caller can warn: otherwise other devices would ask for onboarding again
    },
    loadSnapshot: () => (on ? readSnapshot(uid) : null),
    saveSnapshot: (s) => { if (on) writeSnapshot(uid, s); },
    disclosureAcked: () => readDisclosureAck(uid),
    ackDisclosure: () => writeDisclosureAck(uid),
    lastDomain: () => readLastDomain(uid),
    setLastDomain: (d) => writeLastDomain(uid, d),
    profile: () => profile,
    async saveProfile(p) {
      profile = p;
      writeProfile(uid, p);
      if (on) await writeProfileRemote(db, uid, p);
    },
    history: () => listSessions(db, uid),
  };
  const lazy = createLazyLlm(app);
  let transcriber: Promise<(audio: Blob, mimeType: string) => Promise<string>> | null = null;
  const transcribe = async (audio: Blob, mimeType: string): Promise<string> => {
    transcriber ??= import('../adapters/firebase/transcribe').then((m) => m.createFirebaseTranscriber(app)).catch((e: unknown) => { transcriber = null; throw e; });
    return (await transcriber)(audio, mimeType);
  };
  return {
    kind: 'ready',
    email: auth.currentUser.email,
    llm: lazy.llm,
    warmLlm: lazy.warm,
    transcribe,
    store: createFirestoreStore(db, uid, progress.isOn, { storage: browserStorage(), now: () => Date.now(), ttlMs: CACHE_TTL_MS }),
    clock: { now: () => Date.now() },
    progress,
    lookupFailed,
  };
}

export async function signOutUser(): Promise<void> {
  const app = getFirebaseApp();
  if (app !== null) await getAuth(app).signOut();
}
