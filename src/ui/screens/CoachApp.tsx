'use client';
import { useCallback, useEffect, useState } from 'react';
import { loadRuntime, type RuntimeState, signOutUser } from '../runtime';
import { AuthScreen } from './AuthScreen';
import { CoachScreen } from './CoachScreen';
import { OnboardingScreen } from './OnboardingScreen';

export function CoachApp() {
  const [runtime, setRuntime] = useState<RuntimeState | null>(null);
  const refresh = useCallback(() => { void loadRuntime().then(setRuntime).catch(() => setRuntime({ kind: 'unconfigured' })); }, []);
  useEffect(refresh, [refresh]);
  const signOut = useCallback(() => { void signOutUser().then(() => { setRuntime(null); refresh(); }); }, [refresh]);

  if (runtime?.kind === 'needs_signin') return <AuthScreen onSignedIn={refresh} />;
  // Onboarding comes first: the coach needs to know the role before it starts asking questions.
  if (runtime?.kind === 'ready' && runtime.progress.profile() === null) return <OnboardingScreen progress={runtime.progress} onDone={refresh} />;
  return <CoachScreen runtime={runtime} onSignOut={signOut} />;
}
