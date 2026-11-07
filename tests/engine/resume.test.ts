import { describe, expect, it } from 'vitest';
import { EngineSnapshotSchema, InterviewEngine } from '../../src/engine';
import { evalOf, fakeClock, FakeLlm, FakeStore, json, q } from '../helpers/fakes';

const POOL = [q('i1', 1), q('i2', 1), q('i3', 2)];
const make = () => new InterviewEngine({ llm: new FakeLlm([json(evalOf({}, 0.8))]), store: new FakeStore(POOL), clock: fakeClock, rng: () => 0 });

describe('snapshot / restore', () => {
  it('has nothing to resume before a session, while evaluating-free states aside', () => {
    const e = make();
    expect(e.snapshot()).toBeNull();
    e.start();
    expect(e.snapshot()).toBeNull(); // DISCLOSURE
  });

  it('round-trips an in-progress session and continues on the same question', async () => {
    const a = make();
    a.start(); a.acknowledgeDisclosure(); await a.selectDomain('it');
    await a.submit('I led a project and delivered it on time with measurable results.');
    const snap = a.snapshot();
    expect(snap?.status).toBe('FEEDBACK');
    expect(JSON.stringify(snap)).not.toContain('delivered it on time'); // no answer text persisted

    const b = make();
    const out = await b.restore(JSON.parse(JSON.stringify(snap)));
    expect(out?.status).toBe('FEEDBACK');
    const next = await b.submit('next');
    expect(next.status).toBe('AWAITING_ANSWER');
    expect(next.question?.id).not.toBe('i1');
  });

  it('restores an unanswered question', async () => {
    const a = make();
    a.start(); a.acknowledgeDisclosure(); await a.selectDomain('it');
    const b = make();
    const out = await b.restore(a.snapshot());
    expect(out?.status).toBe('AWAITING_ANSWER');
    expect(out?.question?.id).toBe('i1');
  });

  it('rejects tampered, stale or malformed data instead of crashing', async () => {
    const a = make();
    a.start(); a.acknowledgeDisclosure(); await a.selectDomain('it');
    const good = a.snapshot();
    expect(await make().restore({ ...good, difficulty: 9 })).toBeNull();
    expect(await make().restore({ ...good, status: 'CLOSED' })).toBeNull();
    expect(await make().restore({ ...good, currentId: 'does-not-exist' })).toBeNull();
    expect(await make().restore('garbage')).toBeNull();
    expect(await make().restore(null)).toBeNull();
    expect(EngineSnapshotSchema.safeParse({ ...good, turns: [{ questionId: 'x', skipped: false, relevance: 5, clarity: 0, confidence: 0, professionalism: 0, recommendations: [] }] }).success).toBe(false);
  });

  it('refuses to restore into a session that has already started', async () => {
    const a = make();
    a.start(); a.acknowledgeDisclosure(); await a.selectDomain('it');
    const b = make();
    b.start();
    expect(await b.restore(a.snapshot())).toBeNull();
  });

  it('a finished session has no snapshot', async () => {
    const a = make();
    a.start(); a.acknowledgeDisclosure(); await a.selectDomain('it');
    await a.submit('end');
    expect(a.getStatus()).toBe('SUMMARY');
    expect(a.snapshot()).toBeNull();
  });
});
