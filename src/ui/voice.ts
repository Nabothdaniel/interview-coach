'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { joinSegments } from './speechText';

/** Browser voice helpers (Web Speech API). UI-only: they turn speech into text and text into speech; the engine never sees audio. */

interface RecognitionAlt { transcript: string }
interface RecognitionResult { readonly length: number; readonly isFinal: boolean; [i: number]: RecognitionAlt }
interface RecognitionEvent { readonly resultIndex: number; readonly results: { readonly length: number; [i: number]: RecognitionResult } }
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
}
type RecognitionCtor = new () => Recognition;

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow it in your browser settings to dictate.',
  'service-not-allowed': 'Microphone access is blocked. Allow it in your browser settings to dictate.',
  'no-speech': 'I did not hear anything. Try again.',
  'audio-capture': 'No microphone was found.',
  network: 'Voice input needs an internet connection.',
};

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechInput {
  supported: boolean; listening: boolean; error: string | null;
  /** Starts dictation. `onText` receives the full transcript so far (replace, don't append). */
  start: (onText: (transcript: string) => void, onEnd?: () => void) => void;
  stop: () => void;
}

export function useSpeechInput(lang = 'en-NG'): SpeechInput {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  useEffect(() => { setSupported(recognitionCtor() !== null); return () => rec.current?.abort(); }, []);

  const start = useCallback((onText: (t: string) => void, onEnd?: () => void): void => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    rec.current?.abort();
    const r = new Ctor();
    r.lang = lang; r.continuous = true; r.interimResults = true;
    r.onresult = (e) => {
      const parts: string[] = [];
      for (let i = 0; i < e.results.length; i++) parts.push(e.results[i]?.[0]?.transcript ?? '');
      onText(joinSegments(parts));
    };
    r.onerror = (e) => { setError(ERRORS[e.error] ?? (e.error === 'aborted' ? null : 'Voice input stopped unexpectedly.')); };
    r.onend = () => { setListening(false); onEnd?.(); };
    rec.current = r;
    setError(null);
    try { r.start(); setListening(true); } catch { setListening(false); }
  }, [lang]);
  const stop = useCallback(() => { rec.current?.stop(); }, []);
  return { supported, listening, error, start, stop };
}

export interface SpeechOutput { supported: boolean; speaking: boolean; speak: (text: string) => void; cancel: () => void }

export function useSpeechOutput(lang = 'en-NG'): SpeechOutput {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => { setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window); return () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }; }, []);
  const cancel = useCallback(() => { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); setSpeaking(false); }, []);
  const speak = useCallback((text: string): void => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || text.trim() === '') return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }, [lang]);
  return { supported, speaking, speak, cancel };
}

export interface MicLevels { levels: number[]; ok: boolean }

/**
 * Live loudness bars for the recording UI. Opens its own microphone stream with the browser's echo cancellation, noise suppression and
 * auto gain on, band-passes it (100 Hz to 4 kHz, the speech range), and applies an adaptive noise gate so background hiss stays flat.
 * This feeds the VISUAL only: the browser's speech recogniser captures its own audio and gives no control over it.
 */
export function useMicLevels(active: boolean, bars = 40): MicLevels {
  const [levels, setLevels] = useState<number[]>(() => Array<number>(bars).fill(0));
  const [ok, setOk] = useState(true);
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stream: MediaStream | undefined;
    let ctx: AudioContext | undefined;
    setLevels(Array<number>(bars).fill(0)); setOk(true);
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 100;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4000;
        const an = ctx.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0;
        src.connect(hp); hp.connect(lp); lp.connect(an);
        const buf = new Float32Array(an.fftSize);
        let floor = 0.01; let peak = 0.05;
        timer = setInterval(() => {
          an.getFloatTimeDomainData(buf);
          let sum = 0;
          for (const v of buf) sum += v * v;
          const rms = Math.sqrt(sum / buf.length);
          floor = rms < floor ? rms : floor + (rms - floor) * 0.003;
          const gated = Math.max(0, rms - floor * 1.4);
          peak = Math.max(peak * 0.995, gated, 0.02);
          const level = Math.min(1, (gated / peak) ** 0.8);
          setLevels((prev) => [...prev.slice(1), level]);
        }, 70);
      } catch { if (!stopped) setOk(false); }
    })();
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
    };
  }, [active, bars]);
  return { levels, ok };
}
