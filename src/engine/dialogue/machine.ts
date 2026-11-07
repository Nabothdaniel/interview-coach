import type { SessionStatus } from '../types';

export type SessionEvent =
  | 'START' | 'ACK' | 'SELECT_DOMAIN' | 'QUESTION_SHOWN' | 'NO_QUESTIONS' | 'SUBMIT' | 'NOT_SCORED'
  | 'EVAL_OK' | 'EVAL_FAILED' | 'NEXT' | 'SKIP' | 'REPEAT' | 'CHANGE_DOMAIN' | 'FINISH' | 'END' | 'CLOSE' | 'DISTRESS';

/** Frame/slot dialogue states, ANALYSIS.md §3.1. Pure and exhaustive: anything not listed is illegal. */
export const TRANSITIONS: Record<SessionStatus, Partial<Record<SessionEvent, SessionStatus>>> = {
  IDLE: { START: 'DISCLOSURE' },
  DISCLOSURE: { ACK: 'DOMAIN_SELECT', END: 'CLOSED', DISTRESS: 'CLOSED' },
  DOMAIN_SELECT: { SELECT_DOMAIN: 'ASKING', END: 'CLOSED', DISTRESS: 'CLOSED' },
  ASKING: { QUESTION_SHOWN: 'AWAITING_ANSWER', NO_QUESTIONS: 'DOMAIN_SELECT', FINISH: 'SUMMARY', DISTRESS: 'CLOSED' },
  AWAITING_ANSWER: { SUBMIT: 'EVALUATING', SKIP: 'ASKING', REPEAT: 'AWAITING_ANSWER', NOT_SCORED: 'AWAITING_ANSWER', CHANGE_DOMAIN: 'DOMAIN_SELECT', END: 'SUMMARY', DISTRESS: 'CLOSED' },
  EVALUATING: { EVAL_OK: 'FEEDBACK', NOT_SCORED: 'AWAITING_ANSWER', EVAL_FAILED: 'AWAITING_ANSWER', DISTRESS: 'CLOSED' },
  FEEDBACK: { NEXT: 'ASKING', END: 'SUMMARY', FINISH: 'SUMMARY', CHANGE_DOMAIN: 'DOMAIN_SELECT', DISTRESS: 'CLOSED' },
  SUMMARY: { CLOSE: 'CLOSED', CHANGE_DOMAIN: 'DOMAIN_SELECT', DISTRESS: 'CLOSED' },
  CLOSED: {},
};

export class IllegalTransitionError extends Error {
  constructor(public readonly from: SessionStatus, public readonly event: SessionEvent) {
    super(`Illegal transition: ${event} from ${from}`);
    this.name = 'IllegalTransitionError';
  }
}

export function transition(from: SessionStatus, event: SessionEvent): SessionStatus {
  const to = TRANSITIONS[from][event];
  if (to === undefined) throw new IllegalTransitionError(from, event);
  return to;
}
