import { describe, expect, it } from 'vitest';
import { IllegalTransitionError, TRANSITIONS, transition, type SessionEvent } from '../../src/engine/dialogue/machine';
import type { SessionStatus } from '../../src/engine/types';

const STATUSES = Object.keys(TRANSITIONS) as SessionStatus[];
const EVENTS: SessionEvent[] = ['START','ACK','SELECT_DOMAIN','QUESTION_SHOWN','NO_QUESTIONS','SUBMIT','NOT_SCORED','EVAL_OK','EVAL_FAILED','NEXT','SKIP','REPEAT','CHANGE_DOMAIN','FINISH','END','CLOSE','DISTRESS'];

describe('state machine', () => {
  it('covers all nine thesis/analysis states', () => {
    expect(STATUSES.sort()).toEqual(['ASKING','AWAITING_ANSWER','CLOSED','DISCLOSURE','DOMAIN_SELECT','EVALUATING','FEEDBACK','IDLE','SUMMARY'].sort());
  });
  it('every status x event is either the table target or throws', () => {
    for (const s of STATUSES) for (const e of EVENTS) {
      const target = TRANSITIONS[s][e];
      if (target === undefined) expect(() => transition(s, e)).toThrow(IllegalTransitionError);
      else expect(transition(s, e)).toBe(target);
    }
  });
  it('CLOSED is terminal', () => {
    for (const e of EVENTS) expect(() => transition('CLOSED', e)).toThrow(IllegalTransitionError);
  });
  it('DISTRESS reaches CLOSED from every live state except IDLE', () => {
    for (const s of STATUSES.filter((x) => x !== 'IDLE' && x !== 'CLOSED')) expect(transition(s, 'DISTRESS')).toBe('CLOSED');
  });
});
