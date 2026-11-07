'use client';
import { SplitCard } from '../kit';
import type { ProgressControl } from '../runtime';
import { ProfileForm } from './ProfileForm';

/** Shown once, before the dashboard, until the user has told us the role they are preparing for. */
export function OnboardingScreen({ progress, onDone }: { progress: ProgressControl; onDone: () => void }) {
  return (
    <div className="ui-auth">
      <SplitCard hero={<p className="ui-hero__line">Tell us the role.<br />Get <b>practice</b> that fits it</p>}>
        <ProfileForm progress={progress} submitLabel="Start practising" onSaved={onDone}
          heading={<><h1>Set up your practice</h1><p className="ui-sub">Two quick questions so the coach can speak to your goal.</p></>} />
      </SplitCard>
    </div>
  );
}
