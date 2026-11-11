/** Pure audio helpers for the Gemini voice fallback: turn raw microphone samples into a small, clean 16 kHz mono WAV (a format Gemini documents support for). */

export const WAV_RATE = 16_000;

export function concat(chunks: readonly Float32Array[]): Float32Array {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let p = 0;
  for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}

/** Averaging decimation (a cheap low-pass while resampling). Returns the input untouched when the rates already match. */
export function downsample(input: Float32Array, inRate: number, outRate: number): Float32Array {
  if (outRate >= inRate) return input;
  const ratio = inRate / outRate;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio); const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j] ?? 0;
    out[i] = end > start ? sum / (end - start) : 0;
  }
  return out;
}

const frameRms = (s: Float32Array, from: number, len: number): number => {
  let sum = 0; const to = Math.min(s.length, from + len);
  for (let i = from; i < to; i++) { const v = s[i] ?? 0; sum += v * v; }
  return Math.sqrt(sum / Math.max(1, to - from));
};

export interface TrimOptions { threshold?: number; frameMs?: number; padMs?: number; minVoicedMs?: number }

/**
 * Cuts leading/trailing silence (keeping a short pad) so less audio is uploaded and silence is not "transcribed".
 * Returns an empty array when there is not enough voiced audio: the caller treats that as "nothing heard" and never calls the model.
 */
export function trimSilence(samples: Float32Array, rate: number, { threshold = 0.012, frameMs = 20, padMs = 200, minVoicedMs = 300 }: TrimOptions = {}): Float32Array {
  const frame = Math.max(1, Math.round((rate * frameMs) / 1000));
  let first = -1; let last = -1; let voiced = 0;
  for (let f = 0; f * frame < samples.length; f++) {
    if (frameRms(samples, f * frame, frame) >= threshold) { if (first < 0) first = f; last = f; voiced++; }
  }
  if (first < 0 || voiced * frameMs < minVoicedMs) return new Float32Array(0);
  const pad = Math.round((rate * padMs) / 1000);
  return samples.slice(Math.max(0, first * frame - pad), Math.min(samples.length, (last + 1) * frame + pad));
}

/** Boosts a quiet recording toward a healthy level (never more than `maxGain`, never clips). Does nothing to silence. */
export function normalize(samples: Float32Array, target = 0.85, maxGain = 8): Float32Array {
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  if (peak < 1e-4) return samples;
  const gain = Math.min(maxGain, target / peak);
  if (gain <= 1.05) return samples;
  return samples.map((v) => v * gain);
}

/** 16-bit PCM mono WAV. */
export function encodeWav(samples: Float32Array, rate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string): void => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

/** Whole pipeline used after recording: resample, drop silence, level, encode. Null means "nothing intelligible was recorded". */
export function prepareWav(chunks: readonly Float32Array[], inRate: number): Blob | null {
  const small = downsample(concat(chunks), inRate, WAV_RATE);
  const trimmed = trimSilence(small, Math.min(inRate, WAV_RATE));
  return trimmed.length === 0 ? null : encodeWav(normalize(trimmed), Math.min(inRate, WAV_RATE));
}
