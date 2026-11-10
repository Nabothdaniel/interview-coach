'use client';
import { useEffect, useRef, useState } from 'react';
import { appendTranscript } from '../speechText';
import { useMicLevels, useSpeechInput } from '../voice';
import { IconButton } from './IconButton';

export interface ComposerProps { onSend: (text: string) => void; disabled?: boolean; placeholder?: string; maxLength?: number; onMicStart?: () => void }

const clock = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * Chat input: Enter adds a new line and only the Send button sends. The mic starts a recording pill: bin discards, ✓ puts the
 * transcript in the box to edit, and the round Send button stops and submits it straight away.
 */
export function Composer({ onSend, disabled = false, placeholder = 'Type your answer', maxLength = 4000, onMicStart }: ComposerProps) {
  const [value, setValue] = useState('');
  const [heard, setHeard] = useState('');
  const [secs, setSecs] = useState(0);
  const box = useRef<HTMLTextAreaElement>(null);
  const mode = useRef<'commit' | 'send' | 'cancel'>('commit');
  const latest = useRef('');
  latest.current = value;
  const transcript = useRef('');
  const mic = useSpeechInput();
  const { listening, stop: stopMic } = mic;
  const [coarse, setCoarse] = useState(false);
  useEffect(() => { setCoarse(window.matchMedia('(pointer: coarse)').matches); }, []);
  // Phones usually let only one thing use the microphone: a second stream can make dictation fail or stop. So on touch devices the bars
  // follow the recogniser's own "speaking" signal instead of a separate microphone meter.
  const meter = useMicLevels(listening && !coarse);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value, listening]);
  useEffect(() => { if (!disabled && !listening && !coarse) box.current?.focus(); else if (disabled && listening) { mode.current = 'cancel'; stopMic(); } }, [disabled, listening, stopMic, coarse]);
  useEffect(() => {
    if (!listening) return;
    setSecs(0);
    const t = setInterval(() => setSecs((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [listening]);

  const send = (): void => {
    if (disabled || value.trim() === '') return;
    onSend(value);
    setValue('');
  };
  const startRecording = (): void => {
    onMicStart?.();
    mode.current = 'commit'; transcript.current = '';
    setHeard('');
    mic.start((t) => { transcript.current = t; setHeard(t); }, () => {
      const text = mode.current === 'cancel' ? latest.current : appendTranscript(latest.current, transcript.current, maxLength);
      if (mode.current === 'send' && transcript.current !== '' && text.trim() !== '') { onSend(text); setValue(''); }
      else if (mode.current !== 'cancel') setValue(text);
      setHeard('');
    });
  };
  const finish = (how: 'commit' | 'send' | 'cancel'): void => { mode.current = how; stopMic(); };

  const nearLimit = value.length >= maxLength * 0.8;
  const hint = mic.error ?? (listening ? (heard !== '' ? `Heard: ${heard}` : (meter.ok || coarse) ? 'Recording… speak clearly. Tap Send to submit it, ✓ to edit it first, or the bin to discard.' : 'Recording… (level display unavailable)')
    : nearLimit ? `${value.length} / ${maxLength} characters`
      : mic.supported ? 'Enter adds a new line · Send button submits · The mic uses your browser’s speech service' : 'Enter adds a new line · Send button submits');
  return (
    <>
      {listening ? (
        <div className="ui-composer ui-rec" role="group" aria-label="Voice recording">
          <IconButton icon="trash" label="Discard recording" onClick={() => finish('cancel')} />
          <span className="ui-rec__dot" aria-hidden="true" />
          <span className="ui-rec__time" role="timer">{clock(secs)}</span>
          {coarse ? (
            <div className={`ui-wave ui-wave--signal${mic.speaking ? ' is-speaking' : ''}`} aria-hidden="true">
              {Array.from({ length: 28 }, (_, i) => <i key={i} />)}
            </div>
          ) : (
            <div className="ui-wave" aria-hidden="true">
              {meter.levels.map((v, i) => <i key={i} style={{ height: `${Math.max(10, Math.round(v * 100))}%` }} />)}
            </div>
          )}
          <IconButton icon="check" label="Add to the box so I can edit before sending" onClick={() => finish('commit')} />
          <IconButton icon="send" label="Stop and send my answer" tipAlign="end" solid large onClick={() => finish('send')} />
        </div>
      ) : (
        <div className="ui-composer">
          <label className="ui-sr" htmlFor="ui-composer-input">Your message</label>
          <textarea ref={box} id="ui-composer-input" rows={1} value={value} maxLength={maxLength} disabled={disabled} placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)} />
          <IconButton icon="mic" tipAlign="end" label={mic.supported ? 'Record your answer' : 'Voice input is not supported in this browser (try Chrome, Edge or Safari)'} disabled={disabled || !mic.supported} onClick={startRecording} />
          <IconButton icon="send" label="Send" tipAlign="end" solid large disabled={disabled || value.trim() === ''} onClick={send} />
        </div>
      )}
      <p className={`ui-composer__hint${listening || mic.error ? ' ui-composer__hint--on' : ''}`} aria-live="polite">{hint}</p>
    </>
  );
}
