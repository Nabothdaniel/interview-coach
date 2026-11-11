'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { prepareWav } from './wav';

/**
 * Records the microphone ourselves (for browsers with no built-in speech recognition) and hands back a cleaned WAV.
 * One stream feeds everything: echo cancellation / noise suppression / auto-gain from the browser, a 100 Hz to 7 kHz band filter,
 * a worklet that captures raw samples, and an analyser for the live bars. Nothing is stored; samples live in memory until stop/cancel.
 */
const WORKLET = `
class Cap extends AudioWorkletProcessor {
  constructor() { super(); this.b = []; this.n = 0; this.port.onmessage = (e) => { if (e.data === 'flush') { this.out(); this.port.postMessage('flushed'); } }; }
  out() { if (this.n === 0) return; const o = new Float32Array(this.n); let p = 0; for (const x of this.b) { o.set(x, p); p += x.length; } this.port.postMessage(o, [o.buffer]); this.b = []; this.n = 0; }
  process(inputs) { const c = inputs[0] && inputs[0][0]; if (c) { this.b.push(new Float32Array(c)); this.n += c.length; if (this.n >= 4096) this.out(); } return true; }
}
registerProcessor('cap', Cap);`;

const BARS = 40;
const ERR_BLOCKED = 'Microphone access is blocked. Allow it in your browser settings to record.';

export interface WavRecorder {
  supported: boolean; recording: boolean; ready: boolean; levels: number[]; error: string | null;
  start: () => void;
  /** Stops and resolves a cleaned WAV, or null when nothing intelligible was recorded. */
  stop: () => Promise<Blob | null>;
  cancel: () => void;
}

interface Live { stream: MediaStream; ctx: AudioContext; node: AudioWorkletNode; chunks: Float32Array[]; timer: ReturnType<typeof setInterval>; url: string }

export function useWavRecorder(): WavRecorder {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [levels, setLevels] = useState<number[]>(() => Array<number>(BARS).fill(0));
  const live = useRef<Live | null>(null);
  const token = useRef(0);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && typeof AudioWorkletNode !== 'undefined' && typeof AudioContext !== 'undefined' && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  const teardown = useCallback((): Live | null => {
    const l = live.current; live.current = null;
    if (!l) return null;
    clearInterval(l.timer);
    l.stream.getTracks().forEach((t) => t.stop());
    void l.ctx.close();
    URL.revokeObjectURL(l.url);
    return l;
  }, []);
  useEffect(() => () => { token.current++; teardown(); }, [teardown]);

  const start = useCallback((): void => {
    const my = ++token.current;
    setError(null); setReady(false); setRecording(true); setLevels(Array<number>(BARS).fill(0));
    void (async () => {
      let stream: MediaStream | undefined; let ctx: AudioContext | undefined; let url = '';
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
        if (my !== token.current) { stream.getTracks().forEach((t) => t.stop()); return; }
        ctx = new AudioContext({ latencyHint: 'interactive' });
        url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
        await ctx.audioWorklet.addModule(url);
        if (my !== token.current) { stream.getTracks().forEach((t) => t.stop()); void ctx.close(); URL.revokeObjectURL(url); return; }
        await ctx.resume();
        const src = ctx.createMediaStreamSource(stream);
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 100;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
        const node = new AudioWorkletNode(ctx, 'cap', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
        const mute = ctx.createGain(); mute.gain.value = 0;
        const an = ctx.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0;
        src.connect(hp); hp.connect(lp); lp.connect(node); lp.connect(an); node.connect(mute); mute.connect(ctx.destination);
        const chunks: Float32Array[] = [];
        node.port.onmessage = (e: MessageEvent<unknown>) => { if (e.data instanceof Float32Array) chunks.push(e.data); };
        const buf = new Float32Array(an.fftSize);
        let floor = 0.01; let peak = 0.05;
        const timer = setInterval(() => {
          an.getFloatTimeDomainData(buf);
          let sum = 0; for (const v of buf) sum += v * v;
          const rms = Math.sqrt(sum / buf.length);
          floor = rms < floor ? rms : floor + (rms - floor) * 0.003;
          const gated = Math.max(0, rms - floor * 1.4);
          peak = Math.max(peak * 0.995, gated, 0.02);
          setLevels((prev) => [...prev.slice(1), Math.min(1, (gated / peak) ** 0.8)]);
        }, 70);
        live.current = { stream, ctx, node, chunks, timer, url };
        setReady(true);
      } catch (e) {
        stream?.getTracks().forEach((t) => t.stop()); void ctx?.close(); if (url) URL.revokeObjectURL(url);
        if (my === token.current) { setError((e as { name?: string }).name === 'NotAllowedError' ? ERR_BLOCKED : 'Could not start the microphone.'); setRecording(false); setReady(false); }
      }
    })();
  }, []);

  const stop = useCallback(async (): Promise<Blob | null> => {
    const l = live.current;
    token.current++;
    setRecording(false); setReady(false);
    if (!l) return null;
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, 300);
      l.node.port.onmessage = (e: MessageEvent<unknown>) => { if (e.data instanceof Float32Array) l.chunks.push(e.data); else if (e.data === 'flushed') { clearTimeout(t); resolve(); } };
      l.node.port.postMessage('flush');
    });
    const rate = l.ctx.sampleRate; const chunks = l.chunks;
    teardown();
    return prepareWav(chunks, rate);
  }, [teardown]);

  const cancel = useCallback((): void => { token.current++; teardown(); setRecording(false); setReady(false); }, [teardown]);
  return { supported, recording, ready, levels, error, start, stop, cancel };
}
