import { MAX_ANSWER_CHARS } from '../config';

export interface SanitizedAnswer {
  text: string;
  truncated: boolean;
}

/** Normalise untrusted user input: NFC, strip control chars, collapse blank runs, trim, cap length. */
export function sanitizeAnswer(raw: string): SanitizedAnswer {
  const cleaned = raw
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (cleaned.length <= MAX_ANSWER_CHARS) return { text: cleaned, truncated: false };
  return { text: cleaned.slice(0, MAX_ANSWER_CHARS), truncated: true };
}

const DISTRESS_PATTERNS: RegExp[] = [
  /\b(kill(ing)? myself|end(ing)? my (own )?life|take my own life)\b/i,
  /\bsuicid(e|al)\b/i,
  /\bwant(ed)? to die\b/i,
  /\b(don'?t|do not|no longer) want to (live|be alive|exist)\b/i,
  /\bno reason to live\b/i,
  /\b(self[- ]?harm|hurt(ing)? myself|cut(ting)? myself)\b/i,
];

/** Conservative local backstop; the evaluator's own flags.distress is a second layer. */
export function detectDistressLocal(text: string): boolean {
  return DISTRESS_PATTERNS.some((p) => p.test(text));
}

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+|any\s+)?(the\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i,
  /disregard\s+(all\s+|any\s+)?(the\s+)?(previous|prior|above|earlier|your)\s+(instructions?|prompts?|rules?)/i,
  /\b(give|award|assign|set|rate)\b[^.\n]{0,40}\b(score|rating|relevance)\b[^.\n]{0,20}\b(of|to)\b\s*(1(\.0+)?|10|100|full|max|perfect)/i,
  /\byou are now\b/i,
  /\b(system|developer) prompt\b/i,
  /\bact as\b[^.\n]{0,30}\b(evaluator|grader|judge)\b/i,
];

/** Pattern match only; used to cap the score and flag. Never used to follow instructions. */
export function detectInjectionLocal(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

/** Free text the user typed about themselves (e.g. target role) is still untrusted: one line, no angle brackets, capped. */
export function sanitizeProfileText(text: string, max = 60): string {
  return text.replace(/[<>\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Delimit the candidate answer so the model treats it as data; neutralise delimiter spoofing. */
export function wrapCandidateAnswer(text: string): string {
  const safe = text.replace(/<\/?\s*candidate_answer\s*>/gi, '[tag removed]');
  return `<candidate_answer>\n${safe}\n</candidate_answer>`;
}
