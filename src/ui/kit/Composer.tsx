'use client';
import { useEffect, useRef, useState } from 'react';
import { appendTranscript } from '../speechText';
import { type Transcribe, useVoiceEntry } from '../useVoiceEntry';
import { IconButton } from './IconButton';

export interface ComposerProps {
  onSend: (text: string) => void; disabled?: boolean; placeholder?: string; maxLength?: number; onMicStart?: () => void;
  /** Speech-to-text for browsers with no built-in recognition (Gemini). Omit to leave voice to the browser only. */
  transcribe?: Transcribe;
}

const clock = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * Chat input: Enter adds a new line and only the Send button sends. The mic starts a recording pill (live waveform): the bin discards,
 * ✓ turns the recording into text in the box so you can edit it first, and the round Send button transcribes and submits it in one tap.
 */
export function Composer({ onSend, disabled = false, placeholder = 'Type your answer', maxLength = 4000, onMicStart, transcribe }: ComposerProps) {
  const [value, setValue] = useState('');
  const box = useRef<HTMLTextAreaElement>(null);
  const latest = useRef('');
  latest.current = value;
  const v = useVoiceEntry(transcribe);
  const { active, finish } = v;
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value, active]);
  useEffect(() => {
    if (disabled && active) finishRef.current('cancel');
    else if (!disabled && !active && !window.matchMedia('(pointer: coarse)').matches) box.current?.focus();
  }, [disabled, active]);

  const send = (): void => {
    if (disabled || value.trim() === '') return;
    onSend(value);
    setValue('');
  };
  const record = (): void => {
    onMicStart?.();
    v.start((text, how) => {
      const next = appendTranscript(latest.current, text, maxLength);
      if (how === 'send' && next.trim() !== '') { onSend(next); setValue(''); } else setValue(next);
    });
  };

  const nearLimit = value.length >= maxLength * 0.8;
  const idleHint = nearLimit ? `${value.length} / ${maxLength} characters`
    : v.available ? 'Enter adds a new line · Send button submits · Voice is turned into text by Gemini (your recording is sent to Google, not saved)'
      : 'Enter adds a new line · Send button submits';
  const liveHint = v.finishing ? 'Turning your recording into text…'
    : !v.ready ? 'Getting the microphone ready… speak when the timer starts'
      : 'Recording… speak clearly. Tap Send to submit it, ✓ to edit the text first, or the bin to discard.';
  const hint = v.error ?? (active ? liveHint : idleHint);
  const hintOn = active || v.error !== null;

  return (
    <>
      {active ? (
        <div className={`ui-composer ui-rec${v.ready ? '' : ' is-wait'}${v.finishing ? ' is-finishing' : ''}`} role="group" aria-label="Voice recording" aria-busy={v.finishing || !v.ready}>
          <IconButton icon="trash" label="Discard recording" onClick={() => finish('cancel')} />
          <span className="ui-rec__dot" aria-hidden="true" />
          <span className="ui-rec__time" role="timer">{v.ready ? clock(v.secs) : '…'}</span>
          <div className="ui-wave" aria-hidden="true">
            {v.levels.map((l, i) => <i key={i} style={{ height: `${Math.max(10, Math.round(l * 100))}%` }} />)}
          </div>
          <IconButton icon="check" label="Turn it into text so I can edit before sending" disabled={v.finishing} onClick={() => finish('commit')} />
          <IconButton icon="send" label={v.finishing ? 'Working…' : 'Stop and send my answer'} tipAlign="end" solid large disabled={v.finishing} onClick={() => finish('send')} />
        </div>
      ) : (
        <div className="ui-composer">
          <label className="ui-sr" htmlFor="ui-composer-input">Your message</label>
          <textarea ref={box} id="ui-composer-input" rows={1} value={value} maxLength={maxLength} disabled={disabled} placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)} />
          <IconButton icon="mic" tipAlign="end" label={v.available ? 'Record your answer' : 'Voice input is not available in this browser'} disabled={disabled || !v.available} onClick={record} />
          <IconButton icon="send" label="Send" tipAlign="end" solid large disabled={disabled || value.trim() === ''} onClick={send} />
        </div>
      )}
      <p className={`ui-composer__hint${hintOn ? ' ui-composer__hint--on' : ''}`} aria-live="polite">{hint}</p>
    </>
  );
}
