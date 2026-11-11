import { describe, expect, it } from 'vitest';
import { concat, downsample, encodeWav, normalize, prepareWav, trimSilence } from '../../src/ui/wav';

const tone = (n: number, amp: number, rate = 16000): Float32Array => Float32Array.from({ length: n }, (_, i) => amp * Math.sin((2 * Math.PI * 220 * i) / rate));
const silence = (n: number): Float32Array => new Float32Array(n);

describe('wav helpers', () => {
  it('downsamples by the rate ratio', () => expect(downsample(new Float32Array(48000), 48000, 16000).length).toBe(16000));
  it('leaves audio alone when already at/below the target rate', () => { const a = new Float32Array(10); expect(downsample(a, 16000, 16000)).toBe(a); });
  it('trims leading and trailing silence but keeps a pad', () => {
    const s = concat([silence(16000), tone(8000, 0.3), silence(16000)]);
    const t = trimSilence(s, 16000);
    expect(t.length).toBeLessThan(s.length / 2);
    expect(t.length).toBeGreaterThan(8000);
  });
  it('returns nothing for pure silence or a tiny blip (so the model is never asked to guess)', () => {
    expect(trimSilence(silence(32000), 16000).length).toBe(0);
    expect(trimSilence(concat([silence(8000), tone(1000, 0.3), silence(8000)]), 16000).length).toBe(0);
    expect(prepareWav([silence(48000)], 48000)).toBeNull();
  });
  it('boosts quiet audio up to the gain cap and never clips', () => {
    const q = normalize(tone(1000, 0.05));
    const peak = Math.max(...q.map(Math.abs));
    expect(peak).toBeGreaterThan(0.3); expect(peak).toBeLessThanOrEqual(1);
    expect(normalize(silence(10)).every((v) => v === 0)).toBe(true);
  });
  it('encodes a valid 16-bit mono WAV', async () => {
    const w = encodeWav(tone(1600, 0.5), 16000);
    const b = new DataView(await w.arrayBuffer());
    expect(w.type).toBe('audio/wav');
    expect(String.fromCharCode(b.getUint8(0), b.getUint8(1), b.getUint8(2), b.getUint8(3))).toBe('RIFF');
    expect(b.getUint32(24, true)).toBe(16000);
    expect(w.size).toBe(44 + 1600 * 2);
  });
  it('prepareWav returns a WAV for real voiced audio', () => {
    const w = prepareWav([silence(4800), tone(48000, 0.2, 48000), silence(4800)], 48000);
    expect(w).not.toBeNull();
    expect(w!.size).toBeLessThan(44 + 2 * 16000 * 2);
  });
});
