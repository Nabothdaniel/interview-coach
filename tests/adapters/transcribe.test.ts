import { describe, expect, it, vi } from 'vitest';
import { MAX_AUDIO_BYTES, toBase64, TranscribeError, transcribeWith } from '../../src/adapters/firebase/transcribe';

const audio = (n = 10): Blob => new Blob([new Uint8Array(n).fill(7)], { type: 'audio/webm' });

describe('transcribeWith', () => {
  it('returns the cleaned transcript and sends base64 audio with its mime type', async () => {
    const gen = vi.fn().mockResolvedValue('  I worked   in a team.  \n');
    await expect(transcribeWith(gen, audio(3), 'audio/webm')).resolves.toBe('I worked in a team.');
    expect(gen).toHaveBeenCalledWith(toBase64(new Uint8Array([7, 7, 7])), 'audio/webm');
  });
  it('retries once, then succeeds', async () => {
    const gen = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('hello there my friend');
    await expect(transcribeWith(gen, audio(), 'audio/webm')).resolves.toBe('hello there my friend');
    expect(gen).toHaveBeenCalledTimes(2);
  });
  it('fails with a typed error after one retry (never a crash, never invented text)', async () => {
    const gen = vi.fn().mockRejectedValue(new Error('down'));
    await expect(transcribeWith(gen, audio(), 'audio/webm')).rejects.toMatchObject({ code: 'failed' });
    expect(gen).toHaveBeenCalledTimes(2);
  });
  it('treats "[no speech]" and blank replies as no speech', async () => {
    await expect(transcribeWith(vi.fn().mockResolvedValue('[no speech]'), audio(), 'audio/webm')).rejects.toMatchObject({ code: 'no_speech' });
    await expect(transcribeWith(vi.fn().mockResolvedValue('   '), audio(), 'audio/webm')).rejects.toBeInstanceOf(TranscribeError);
  });
  it('rejects empty and oversized audio without calling the model', async () => {
    const gen = vi.fn();
    await expect(transcribeWith(gen, new Blob([]), 'audio/webm')).rejects.toMatchObject({ code: 'no_speech' });
    await expect(transcribeWith(gen, audio(MAX_AUDIO_BYTES + 1), 'audio/webm')).rejects.toMatchObject({ code: 'too_large' });
    expect(gen).not.toHaveBeenCalled();
  });
  it('base64-encodes large buffers without overflowing the stack', () => {
    expect(toBase64(new Uint8Array(200_000)).length).toBeGreaterThan(200_000);
  });
});
