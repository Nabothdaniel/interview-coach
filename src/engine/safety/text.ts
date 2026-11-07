/** Thesis §3.6 — full disclosure; the user acknowledges it once per account (docs/decisions.md). */
export const AI_DISCLOSURE =
  'You are talking to an AI interview coach. Your feedback is generated automatically and may be imperfect. ' +
  'Your answers are sent to Google’s Gemini service to be analysed. Do not include personal details you want kept private.';

/** Shown at the start of every later session in place of the full acknowledgement (no click needed). */
export const AI_NOTICE_SHORT =
  'Reminder: you are talking to an AI coach. Feedback is generated automatically, and your answers are sent to Google’s Gemini service for analysis.';

export const HELP_TEXT =
  'You are in charge. Try: "ask me about SQL" (or any topic), "harder" or "easier", "switch to business", "any topic" to clear a focus, ' +
  '"repeat", "skip", "next", or "end" for your summary.';

/** Shown when the evaluator flags distress; scoring stops. Helpline specifics must be verified before launch. */
export const DISTRESS_MESSAGE =
  'It sounds like you may be going through something difficult, and that matters more than any interview. ' +
  'We are pausing this session. Please talk to someone you trust, a campus counsellor, or a local support service. ' +
  'You can come back to practise whenever you feel ready.';
