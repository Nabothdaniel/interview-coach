'use client';
import { type FormEvent, type ReactNode, useState } from 'react';
import { LEVELS, type Level, MAX_ROLE_CHARS, ProfileSchema } from '../../engine';
import { Button, Chip, Switch, TextField } from '../kit';
import type { ProgressControl } from '../runtime';

const LEVEL_LABEL: Record<Level, string> = { student: 'Student', graduate: 'Recent graduate', entry: 'Entry level', experienced: 'Some experience' };
const SUGGESTIONS = ['Software developer', 'Data analyst', 'Accountant', 'Marketing officer', 'Customer service', 'Graduate trainee'];

export const levelLabel = (l: Level): string => LEVEL_LABEL[l];

/** Onboarding / edit-profile form: target role, experience level, and the opt-in to save progress (default OFF). */
export function ProfileForm({ progress, submitLabel, onSaved, heading }: { progress: ProgressControl; submitLabel: string; onSaved: () => void; heading?: ReactNode }) {
  const initial = progress.profile();
  const [role, setRole] = useState(initial?.targetRole ?? '');
  const [level, setLevel] = useState<Level>(initial?.level ?? 'graduate');
  const [save, setSave] = useState(progress.isOn());
  const [error, setError] = useState<string | undefined>();
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (warning !== null) { onSaved(); return; } // second click after a warning: carry on
    const parsed = ProfileSchema.safeParse({ targetRole: role, level });
    if (!parsed.success) { setError(`Enter the role you are preparing for (2 to ${MAX_ROLE_CHARS} characters).`); return; }
    setBusy(true); setError(undefined);
    let failed = false;
    try { await progress.saveProfile(parsed.data); } catch { failed = true; }
    if (save !== progress.isOn()) { try { await progress.setOn(save); } catch { failed = true; } }
    setBusy(false);
    if (failed) setWarning('Saved on this device, but I could not reach your account. Check your connection and that the database rules are deployed. You can continue and try again from the dashboard.');
    else onSaved();
  };

  return (
    <form className="ui-form" onSubmit={(e) => void submit(e)} noValidate>
      {heading}
      <TextField id="role" label="What role are you preparing for?" value={role} maxLength={MAX_ROLE_CHARS} placeholder="e.g. Junior accountant" error={error}
        hint="Used to make feedback relevant to that job." autoComplete="off" onChange={(e) => { setRole(e.target.value); setError(undefined); }} />
      <div className="ui-row" style={{ flexWrap: 'wrap' }}>
        {SUGGESTIONS.map((s) => <Chip key={s} type="button" onClick={() => { setRole(s); setError(undefined); }}>{s}</Chip>)}
      </div>
      <fieldset className="ui-fieldset">
        <legend>Where are you now?</legend>
        <div className="ui-row" style={{ flexWrap: 'wrap' }}>
          {LEVELS.map((l) => <Button key={l} variant={level === l ? 'solid' : 'ghost'} aria-pressed={level === l} onClick={() => setLevel(l)}>{LEVEL_LABEL[l]}</Button>)}
        </div>
      </fieldset>
      <div>
        <Switch id="onboard-save" label={save ? 'Save my progress: on' : 'Save my progress: off'} checked={save} onChange={setSave} />
        <p className="ui-note">Off by default. When on, your scores, question-by-question breakdown and this role are saved to your account so you can see your history. Your answer text is never saved. Answers are sent to Google’s Gemini service for analysis either way.</p>
      </div>
      {warning !== null ? <p className="ui-field__msg ui-field__msg--err" role="alert">{warning}</p> : null}
      <Button type="submit" loading={busy}>{warning !== null ? 'Continue' : submitLabel}</Button>
    </form>
  );
}
