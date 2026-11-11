'use client';
import { useEffect, useRef, useState } from 'react';
import { MAX_AUDIO_SECONDS, TranscribeError } from '../adapters/firebase/transcribe';
import { useWavRecorder } from './wavRecorder';

export type Transcribe = (audio: Blob, mimeType: string) => Promise<string>;
export type FinishHow = 'commit' | 'send' | 'cancel';

const MESSAGES: Record<string, string> = {
  no_speech: 'I did not hear anything. Try again a little closer to the microphone.',
  too_large: 'That recording was too long. Try a shorter answer.',
  failed: 'Could not turn the recording into text. Check your connection and try again.',
};

/**
 * Voice entry: record, clean the audio, transcribe with Gemini, then hand the TEXT to the composer. The transcript must be text before it
 * reaches the engine, because the engine's local safety and command checks (distress, skip/repeat, injection) run on text before any scoring.
 * 'send' transcribes and submits in one tap; 'commit' puts the text in the box for review first. No scoring or dialogue decisions here.
 */
export function useVoiceEntry(transcribe?: Transcribe) {
  const rec = useWavRecorder();
  const available = rec.supported && transcribe !== undefined;
  const [finishing, setFinishing] = useState(false);
  const [secs, setSecs] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const sink = useRef<((text: string, how: 'commit' | 'send') => void) | null>(null);
  const run = useRef(0);

  const active = rec.recording || finishing;
  useEffect(() => {
    if (!rec.recording || !rec.ready) return;
    setSecs(0);
    const t = setInterval(() => setSecs((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [rec.recording, rec.ready]);

  const start = (onResult: (text: string, how: 'commit' | 'send') => void): void => {
    sink.current = onResult; setNote(null); setFinishing(false); run.current++;
    rec.start();
  };

  const finish = (how: FinishHow): void => {
    const my = ++run.current;
    if (how === 'cancel') { rec.cancel(); setFinishing(false); return; }
    setFinishing(true);
    void (async () => {
      const wav = await rec.stop();
      if (my !== run.current) return;
      if (wav === null || !transcribe) { setNote(MESSAGES.no_speech ?? null); setFinishing(false); return; }
      try {
        const text = await transcribe(wav, 'audio/wav');
        if (my === run.current) sink.current?.(text, how);
      } catch (e) {
        if (my === run.current) setNote(MESSAGES[e instanceof TranscribeError ? e.code : 'failed'] ?? null);
      } finally { if (my === run.current) setFinishing(false); }
    })();
  };

  useEffect(() => { if (rec.recording && secs >= MAX_AUDIO_SECONDS) finish('commit'); });

  return { available, active, ready: rec.ready, finishing, secs, levels: rec.levels, error: rec.error ?? note, start, finish };
}
