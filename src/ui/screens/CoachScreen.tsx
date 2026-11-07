'use client';
import { Fragment, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { DOMAINS, type Domain, MAX_ANSWER_CHARS, type SessionStatus } from '../../engine';
import { Icon } from '../icons/Icon';
import { AvatarChip, BarChart, Bubble, Button, Card, Chip, Composer, IconRail, Loading, Menu, Modal, Pane, PaneBody, Shell, Stage, Switch, Tag, Widget } from '../kit';
import type { RuntimeState } from '../runtime';
import { useInterview } from '../useInterview';
import { DOMAIN_META } from './domains';
import { FeedbackCard } from './FeedbackCard';
import { CHIP_TIP, TIER_TIP, WIDGET_TIP } from './hints';
import { levelLabel, ProfileForm } from './ProfileForm';
import { deriveQuestions } from './questionList';

// Rarely-needed views load on first use, with a spinner while they arrive, instead of shipping in the first bundle.
const PrivacyContent = lazy(() => import('./PrivacyContent').then((m) => ({ default: m.PrivacyContent })));
const HistoryContent = lazy(() => import('./HistoryContent').then((m) => ({ default: m.HistoryContent })));
const SummaryCard = lazy(() => import('./SummaryCard').then((m) => ({ default: m.SummaryCard })));

const STATUS_LABEL: Record<SessionStatus, string> = {
  IDLE: 'Not started', DISCLOSURE: 'Before we begin', DOMAIN_SELECT: 'Choose a domain', ASKING: 'Preparing a question',
  AWAITING_ANSWER: 'Waiting for your answer', EVALUATING: 'Reviewing your answer', FEEDBACK: 'Feedback ready', SUMMARY: 'Session complete', CLOSED: 'Session closed',
};
const STATE_LABEL = { current: 'In progress', answered: 'Answered', skipped: 'Skipped' } as const;
const TIER_LABEL = { high: 'Strong', moderate: 'Partial', low: 'Needs focus' } as const;
/** What the coach is doing while a call is in flight (display only; the engine decides the actual flow). */
const busyLabel = (s: SessionStatus): string => (s === 'AWAITING_ANSWER' || s === 'FEEDBACK' || s === 'EVALUATING' ? 'Reviewing your answer…' : 'Preparing your question…');
const isDomain = (d: string | null): d is Domain => d !== null && (DOMAINS as readonly string[]).includes(d);
const LEVEL = { 1: 'Gentle', 2: 'Medium', 3: 'Challenging' } as const;
const PLACEHOLDER: Partial<Record<SessionStatus, string>> = {
  DOMAIN_SELECT: 'Type a domain, e.g. "IT, networking"',
  AWAITING_ANSWER: 'Type your answer, or tell me what you want, e.g. "ask me about SQL"',
  FEEDBACK: 'Say "next", or steer me: "harder", "ask me about teamwork"',
  SUMMARY: 'Say "change domain" or "ask me about SQL" to practise again',
};

function Notice({ runtime }: { runtime: RuntimeState | null }) {
  if (runtime === null) return <p className="ui-notice"><Loading label="Starting up…" /></p>;
  if (runtime.kind === 'unconfigured') return <p className="ui-notice">Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* values to .env.local and restart.</p>;
  return null;
}

export function CoachScreen({ runtime, onSignOut }: { runtime: RuntimeState | null; onSignOut: () => void }) {
  const iv = useInterview(runtime);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [profile, setProfile] = useState(() => (runtime?.kind === 'ready' ? runtime.progress.profile() : null));
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [iv.items.length, iv.busy]);

  const canType = !iv.busy && (iv.status === 'DOMAIN_SELECT' || iv.status === 'AWAITING_ANSWER' || iv.status === 'FEEDBACK' || iv.status === 'SUMMARY');
  const answering = iv.status === 'AWAITING_ANSWER';
  const chooser = iv.status === 'DOMAIN_SELECT';
  const questions = deriveQuestions(iv.items);
  const p = iv.progress;
  const pct = p ? Math.min(100, Math.round((p.answered / p.max) * 100)) : 0;
  const picked = iv.domain ?? iv.lastDomain;
  const ended = iv.status === 'SUMMARY' || iv.status === 'CLOSED';
  const inProgress = !ended && (iv.progress?.answered ?? 0) > 0;

  return (
    <Stage>
      <Shell>
        <IconRail
          items={[
            { id: 'coach', icon: 'coach', label: 'Coach', active: true },
            ...(runtime?.kind === 'ready' ? [
              { id: 'new', icon: 'plus' as const, label: 'New session', onSelect: () => (inProgress ? setConfirmNew(true) : iv.newSession()) },
              { id: 'history', icon: 'history' as const, label: 'Your history', onSelect: () => setHistoryOpen(true) },
            ] : []),
            { id: 'about', icon: 'info', label: 'About and privacy', onSelect: () => setAboutOpen(true) },
          ]}
          footer={runtime?.kind === 'ready' ? (
            <Menu
              trigger={<span className="ui-me">{(runtime.email ?? '?').slice(0, 1).toUpperCase()}</span>}
              header={<><b>Signed in</b><span className="ui-meta">{runtime.email ?? 'your account'}</span></>}
              items={[
                { id: 'profile', label: 'Your role and settings', icon: 'user', onSelect: () => setProfileOpen(true) },
                { id: 'about', label: 'About and privacy', icon: 'info', onSelect: () => setAboutOpen(true) },
                { id: 'out', label: 'Sign out', icon: 'logout', danger: true, onSelect: () => setConfirmOut(true) },
              ]}
            />
          ) : undefined}
        />

        <Pane variant="list" label="Practice" title={<><b>All</b> Practice</>}>
          {profile ? <p className="ui-note" style={{ padding: '0 20px' }}>Preparing for <b>{profile.targetRole}</b> · {levelLabel(profile.level)}</p> : null}
          <div className="ui-avrow">
            {DOMAINS.map((d) => (
              <AvatarChip key={d} tip={DOMAIN_META[d].blurb} name={DOMAIN_META[d].short} role={DOMAIN_META[d].role} icon={DOMAIN_META[d].icon} tone={DOMAIN_META[d].tone}
                selected={isDomain(picked) && picked === d} disabled={!chooser || iv.busy} onSelect={() => void iv.chooseDomain(d)} />
            ))}
          </div>
          <PaneBody>
            {questions.length === 0 ? <p className="ui-note">Your questions will appear here as you work through the session.</p> : null}
            {[...questions].reverse().map((q) => (
              <article key={q.id} className={`ui-qcard${q.state === 'current' ? ' ui-qcard--current' : ''}`}>
                <span className="ui-eyebrow" style={{ margin: 0 }}>{STATE_LABEL[q.state]}</span>
                <h3>{q.text}</h3>
                {q.tier ? <div className="ui-qcard__meta"><Tag tip={TIER_TIP[q.tier]}><Icon name="target" size={12} />{TIER_LABEL[q.tier]}</Tag></div> : null}
              </article>
            ))}
          </PaneBody>
        </Pane>

        <Pane label="Interview" title={<>Interview coach</>} action={<Tag>{STATUS_LABEL[iv.status]}</Tag>}>
          <Notice runtime={runtime} />
          <div className="ui-thread" aria-live="polite">
            {iv.items.map((it) => {
              if (it.kind === 'user') return <Bubble key={it.id} from="me">{it.text}</Bubble>;
              if (it.kind === 'feedback' && it.feedback) return <Fragment key={it.id}><Bubble from="coach">{it.text}</Bubble><FeedbackCard fb={it.feedback} /></Fragment>;
              if (it.kind === 'summary' && it.summary) return <Suspense key={it.id} fallback={<Loading label="Preparing your summary…" />}><SummaryCard summary={it.summary} /></Suspense>;
              if (it.kind === 'disclosure') {
                return (
                  <Card key={it.id} eyebrow="Before we begin" title="You are talking to an AI">
                    <p className="ui-meta" style={{ lineHeight: 1.5 }}><Icon name="shield" size={14} /> {it.text}</p>
                    {iv.status === 'DISCLOSURE' ? <Button icon="check" loading={iv.busy} onClick={() => void iv.acknowledge()}>I understand</Button> : null}
                  </Card>
                );
              }
              return <Bubble key={it.id} from="coach" variant={it.kind === 'question' ? 'question' : it.kind === 'distress' ? 'distress' : 'plain'}>{it.text}</Bubble>;
            })}
            {chooser ? <div className="ui-row" style={{ flexWrap: 'wrap' }}>
              {isDomain(iv.lastDomain) ? <Button variant="accent" icon="repeat" disabled={iv.busy} onClick={() => void iv.chooseDomain(iv.lastDomain as Domain)}>Continue with {DOMAIN_META[iv.lastDomain].label}</Button> : null}
              {DOMAINS.filter((d) => d !== iv.lastDomain).map((d) => (
                <Button key={d} variant="ghost" icon={DOMAIN_META[d].icon} disabled={iv.busy} onClick={() => void iv.chooseDomain(d)}>{DOMAIN_META[d].label}</Button>
              ))}</div> : null}
            {ended ? <div className="ui-row"><Button icon="plus" disabled={iv.busy} onClick={iv.newSession}>Start a new session</Button></div> : null}
            {iv.busy ? <Bubble from="coach"><Loading label={busyLabel(iv.status)} /></Bubble> : null}
            <div ref={end} />
          </div>
          <div className="ui-chips">
            {iv.failedAnswer !== null && answering ? <Chip icon="repeat" tip={CHIP_TIP.retry} disabled={!canType} onClick={iv.retry}>Retry my answer</Chip> : null}
            {answering ? <><Chip icon="repeat" tip={CHIP_TIP.repeat} disabled={!canType} onClick={() => void iv.send('repeat')}>Repeat</Chip><Chip icon="skip" tip={CHIP_TIP.skip} disabled={!canType} onClick={() => void iv.send('skip')}>Skip</Chip></> : null}
            {iv.status === 'FEEDBACK' ? <Chip icon="skip" tip={CHIP_TIP.next} disabled={!canType} onClick={() => void iv.send('next')}>Next question</Chip> : null}
            {answering || iv.status === 'FEEDBACK' ? <><Chip icon="layers" tip={CHIP_TIP.harder} disabled={!canType} onClick={() => void iv.send('harder')}>Harder</Chip><Chip icon="layers" tip={CHIP_TIP.easier} disabled={!canType} onClick={() => void iv.send('easier')}>Easier</Chip><Chip icon="flag" tip={CHIP_TIP.end} disabled={!canType} onClick={() => void iv.send('end')}>End</Chip></> : null}
            {iv.status === 'SUMMARY' ? <Chip icon="layers" tip={CHIP_TIP.again} disabled={!canType} onClick={() => void iv.send('change domain')}>Practise again</Chip> : null}
          </div>
          <Composer disabled={!canType} maxLength={MAX_ANSWER_CHARS} onSend={(t) => void iv.send(t)} placeholder={canType ? PLACEHOLDER[iv.status] ?? 'Type a message' : STATUS_LABEL[iv.status]} />
        </Pane>

        <Pane variant="aside" label="Insights" title="Insights">
          <PaneBody>
            <div className="ui-wgrid">
              <Widget wide title="This session" hint={WIDGET_TIP.session} sub={p?.domain ? DOMAIN_META[p.domain].label : 'Pick a domain to begin'}>
                <div className="ui-widget__big">{p?.answered ?? 0}<small> of {p?.max ?? 5} answered</small></div>
                <div className="ui-progress" role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={p?.max ?? 5} aria-valuenow={p?.answered ?? 0}><i style={{ width: `${pct}%` }} /></div>
                {p?.domain ? <p className="ui-note">{LEVEL[p.difficulty]} level · {p.focus ? `Focus: ${p.focus}` : 'Mixed topics'}{p.skipped ? ` · ${p.skipped} skipped` : ''}</p> : null}
              </Widget>
              <Widget wide title="How you are doing" hint={WIDGET_TIP.doing} sub={p && p.answered > 0 ? `Average of ${p.answered} answer${p.answered === 1 ? '' : 's'}` : undefined}>
                {p?.averages ? <BarChart bars={[
                  { label: 'Relevance', value: p.averages.relevance }, { label: 'Clarity', value: p.averages.clarity },
                  { label: 'Confidence', value: p.averages.confidence }, { label: 'Tone', value: p.averages.professionalism },
                ]} /> : <p className="ui-note">Answer a question and your averages will build up here across the whole session.</p>}
              </Widget>
              <Widget wide title="Work on next" hint={WIDGET_TIP.next} sub={p && p.topRecommendations.length > 0 ? 'Most common across your answers' : undefined}>
                {p && p.topRecommendations.length > 0
                  ? <ul className="ui-tasks">{p.topRecommendations.map((r) => <li key={r}><span className="ui-box" />{r}</li>)}</ul>
                  : <p className="ui-note">Your top things to improve will appear here.</p>}
              </Widget>
              <Widget wide title="Save my progress" hint={WIDGET_TIP.save} sub={iv.saveOn ? 'On' : 'Off (default)'}>
                <Switch id="save-progress" label={iv.saveOn ? 'Saving is on' : 'Saving is off'} checked={iv.saveOn} disabled={iv.saving || runtime?.kind !== 'ready'} onChange={(v) => void iv.setSaveProgress(v)} />
                {iv.saving ? <Loading label="Updating…" size={14} /> : null}
                <p className="ui-note">{iv.saveOn
                  ? 'Your scores and summary are saved to your account when a session ends, and an unfinished session resumes after a reload. Your answer text is never saved. Answers are still sent to Google’s Gemini service for analysis.'
                  : 'Nothing is saved, so reloading the page starts over. Turn this on to keep your progress. Answers are sent to Google’s Gemini service for analysis either way.'}</p>
                {iv.saveError ? <p className="ui-field__msg ui-field__msg--err" role="alert">{iv.saveError}</p> : null}
              </Widget>
            </div>
          </PaneBody>
        </Pane>
      </Shell>
      <Modal open={aboutOpen} title="About and privacy" onClose={() => setAboutOpen(false)}><Suspense fallback={<Loading label="Loading…" />}><PrivacyContent /></Suspense></Modal>
      <Modal open={historyOpen} title="Your history" onClose={() => setHistoryOpen(false)}>
        {runtime?.kind === 'ready' ? <Suspense fallback={<Loading label="Loading…" />}><HistoryContent load={runtime.progress.history} saveOn={iv.saveOn} /></Suspense> : null}
      </Modal>
      <Modal open={profileOpen} title="Your role and settings" size="sm" onClose={() => setProfileOpen(false)}>
        {runtime?.kind === 'ready' ? <ProfileForm progress={runtime.progress} submitLabel="Save" onSaved={() => { setProfile(runtime.progress.profile()); setProfileOpen(false); }} /> : null}
      </Modal>
      <Modal open={confirmNew} size="sm" title="Start a new session?" onClose={() => setConfirmNew(false)}
        footer={<><Button variant="ghost" onClick={() => setConfirmNew(false)}>Keep going</Button><Button onClick={() => { setConfirmNew(false); iv.newSession(); }}>Start new</Button></>}>
        <p className="ui-meta" style={{ margin: 0, lineHeight: 1.5 }}>Your current session will end without a summary{iv.saveOn ? ' and will not be saved' : ''}.</p>
      </Modal>
      <Modal open={confirmOut} size="sm" title="Sign out?" onClose={() => setConfirmOut(false)}
        footer={<><Button variant="ghost" onClick={() => setConfirmOut(false)}>Stay</Button><Button onClick={() => { setConfirmOut(false); onSignOut(); }}>Sign out</Button></>}>
        <p className="ui-meta" style={{ margin: 0, lineHeight: 1.5 }}>Your current practice session will end. Nothing has been saved, so it will not be kept.</p>
      </Modal>
    </Stage>
  );
}
