/** Pure text clean-up for transcribed speech. No scoring, no content changes: it only repairs how the words are joined and written. */

/**
 * Light, safe tidy-up: single spaces, no space before punctuation, standalone "i" -> "I", capital at sentence starts,
 * and a final full stop on a real sentence. It does NOT remove filler words or correct grammar or dialect: hesitation is part of what
 * the coach assesses, and non-standard English must not be "fixed" (AGENTS.md §6 fairness).
 */
export function tidyTranscript(text: string): string {
  let t = text.replace(/\s+/g, ' ').trim();
  if (t === '') return '';
  t = t.replace(/\s+([,.!?;:])/g, '$1').replace(/\bi\b/g, 'I');
  t = t.replace(/(^|[.!?]\s+)([a-z])/g, (_m, pre: string, c: string) => pre + c.toUpperCase());
  if (/[A-Za-z0-9]$/.test(t) && t.split(' ').length >= 4) t += '.';
  return t;
}

/** Appends a transcript to what is already typed, with exactly one space between them. */
export function appendTranscript(existing: string, transcript: string, max: number): string {
  const add = tidyTranscript(transcript);
  if (add === '') return existing;
  const base = existing === '' ? '' : `${existing.replace(/\s+$/, '')} `;
  return (base + add).slice(0, max);
}
