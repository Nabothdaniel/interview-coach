'use client';
import { Button, SplitCard } from '../kit';

/** Shown when this device has no saved profile and we could not reach the account to check for one. */
export function LookupFailedScreen({ onRetry, onContinue }: { onRetry: () => void; onContinue: () => void }) {
  return (
    <div className="ui-auth">
      <SplitCard hero={<p className="ui-hero__line">Welcome <b>back</b></p>}>
        <div className="ui-form">
          <h1>Could not load your account</h1>
          <p className="ui-sub">This device has no saved setup and we could not reach your account to check. Check your connection and try again.</p>
          <Button className="ui-btn--block" onClick={onRetry}>Try again</Button>
          <button type="button" className="ui-link ui-link--small ui-center" onClick={onContinue}>Set up again on this device</button>
        </div>
      </SplitCard>
    </div>
  );
}
