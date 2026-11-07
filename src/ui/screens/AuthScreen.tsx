'use client';
import { type FormEvent, useRef, useState } from 'react';
import { type AuthMode, authenticate, EMAIL_RE, passwordChecks, requestPasswordReset } from '../auth';
import { Icon } from '../icons/Icon';
import { Button, Checkbox, Modal, PasswordField, SplitCard, TextField } from '../kit';
import { PrivacyContent } from './PrivacyContent';

function Hero() {
  return (
    <>
      <svg className="ui-hero__art" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
        <defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff7a59" /><stop offset="1" stopColor="#7a4dff" /></linearGradient></defs>
        <path d="M100 28 176 160H24z" fill="none" stroke="url(#hg)" strokeWidth="14" strokeLinejoin="round" opacity=".85" />
        <path d="M100 76 140 148H60z" fill="url(#hg)" opacity=".55" />
      </svg>
      <span className="ui-hero__mark"><Icon name="target" size={18} /></span>
      <p className="ui-hero__line">Practise today.<br />Interview with <b>confidence</b></p>
    </>
  );
}

type Field = 'email' | 'password' | 'confirm' | 'consent';

function validate(mode: AuthMode, v: { email: string; password: string; confirm: string; consent: boolean }): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  if (v.email.trim() === '') e.email = 'Enter your email address.';
  else if (!EMAIL_RE.test(v.email.trim())) e.email = 'That does not look like an email address.';
  if (v.password === '') e.password = 'Enter your password.';
  if (mode === 'register') {
    const c = passwordChecks(v.password);
    if (v.password !== '' && !(c.length && c.mix)) e.password = 'Use at least 8 characters with letters and numbers.';
    if (v.confirm !== v.password) e.confirm = 'The passwords do not match.';
    if (!v.consent) e.consent = 'Please confirm you understand how your answers are used.';
  }
  return e;
}

function ForgotModal({ open, initial, onClose }: { open: boolean; initial: string; onClose: () => void }) {
  const [email, setEmail] = useState(initial);
  const [err, setErr] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) { setErr('Enter a valid email address.'); return; }
    setBusy(true); setErr(undefined);
    const r = await requestPasswordReset(email);
    setBusy(false);
    if (r.ok) setSent(true); else setErr(r.message);
  };
  return (
    <Modal open={open} size="sm" title="Reset your password" onClose={onClose}>
      {sent ? (
        <>
          <p className="ui-meta" style={{ lineHeight: 1.5 }}>If an account exists for <b>{email.trim()}</b>, a reset link is on its way. Check your spam folder too.</p>
          <Button onClick={onClose}>Done</Button>
        </>
      ) : (
        <form className="ui-form" onSubmit={(e) => void submit(e)} noValidate>
          <p className="ui-meta" style={{ margin: 0, lineHeight: 1.5 }}>Enter the email you signed up with and we will send you a link to choose a new password.</p>
          <TextField id="reset-email" label="Email" type="email" autoComplete="email" data-autofocus value={email} onChange={(e) => setEmail(e.target.value)} error={err} />
          <Button type="submit" disabled={busy} className="ui-btn--block">{busy ? 'Sending…' : 'Send reset link'}</Button>
        </form>
      )}
    </Modal>
  );
}

export function AuthScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [consent, setConsent] = useState(false);
  const [remember, setRemember] = useState(true);
  const [visible, setVisible] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const login = mode === 'login';

  const errors = validate(mode, { email, password, confirm, consent });
  const show = (f: Field): string | undefined => (submitted || touched[f] ? errors[f] : undefined);
  const touch = (f: Field) => () => setTouched((t) => ({ ...t, [f]: true }));
  const checks = passwordChecks(password);

  const switchMode = (): void => { setMode(login ? 'register' : 'login'); setSubmitted(false); setTouched({}); setFormError(null); setConfirm(''); setConsent(false); };

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitted(true);
    setFormError(null);
    const first = (['email', 'password', 'confirm', 'consent'] as const).find((f) => errors[f]);
    if (first) { form.current?.querySelector<HTMLElement>(`[data-field="${first}"], #${first === 'consent' ? 'consent' : first}`)?.focus(); return; }
    setBusy(true);
    const r = await authenticate({ email, password, remember, mode });
    setBusy(false);
    if (r.ok) onSignedIn(); else setFormError(r.message);
  };

  return (
    <div className="ui-auth">
      <SplitCard hero={<Hero />}>
        <form ref={form} className="ui-form" onSubmit={(e) => void submit(e)} noValidate>
          <h1>{login ? 'Welcome back' : 'Create your account'}</h1>
          <p className="ui-meta ui-sub">{login ? 'Log in to continue practising' : 'Free interview practice, in minutes'}</p>

          <TextField id="email" label="Email" type="email" inputMode="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)} onBlur={touch('email')} error={show('email')} />

          <PasswordField id="password" label="Password" autoComplete={login ? 'current-password' : 'new-password'} value={password}
            visible={visible} onVisibleChange={setVisible} onChange={(e) => setPassword(e.target.value)} onBlur={touch('password')} error={show('password')}
            hint={login ? undefined : 'At least 8 characters, with letters and numbers.'} />

          {login ? null : (
            <>
              <ul className="ui-rules" aria-label="Password requirements">
                <li data-ok={checks.length}><Icon name="check" size={13} />8+ characters</li>
                <li data-ok={checks.mix}><Icon name="check" size={13} />Letters and numbers</li>
              </ul>
              <PasswordField id="confirm" label="Confirm password" autoComplete="new-password" value={confirm} visible={visible} onVisibleChange={setVisible}
                onChange={(e) => setConfirm(e.target.value)} onBlur={touch('confirm')} error={show('confirm')} />
              <div>
                <Checkbox id="consent" label="I understand my answers are sent to Google’s Gemini service for analysis." checked={consent} onChange={(e) => setConsent(e.target.checked)} onBlur={touch('consent')} aria-invalid={show('consent') ? true : undefined} />
                {show('consent') ? <p className="ui-field__msg ui-field__msg--err" role="alert">{show('consent')}</p> : null}
                <button type="button" className="ui-link ui-link--small" onClick={() => setPrivacy(true)}>How is my data used?</button>
              </div>
            </>
          )}

          {login ? (
            <div className="ui-row" style={{ justifyContent: 'space-between' }}>
              <Checkbox id="remember" label="Remember me" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <button type="button" className="ui-link ui-link--small" onClick={() => setForgot(true)}>Forgot password?</button>
            </div>
          ) : null}

          {formError ? <p className="ui-banner" role="alert"><Icon name="alert" size={16} />{formError}</p> : null}
          <Button type="submit" disabled={busy} className="ui-btn--block">{busy ? 'Please wait…' : login ? 'Log in' : 'Create account'}</Button>
          <p className="ui-meta ui-center">
            {login ? 'New here? ' : 'Already have an account? '}
            <button type="button" className="ui-link" onClick={switchMode}>{login ? 'Create an account' : 'Log in'}</button>
          </p>
        </form>
      </SplitCard>
      {forgot ? <ForgotModal open initial={email} onClose={() => setForgot(false)} /> : null}
      <Modal open={privacy} title="About and privacy" onClose={() => setPrivacy(false)}><PrivacyContent /></Modal>
    </div>
  );
}
