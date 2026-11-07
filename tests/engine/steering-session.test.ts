import { describe, expect, it } from 'vitest';
import { InterviewEngine } from '../../src/engine/dialogue/session';
import { AI_NOTICE_SHORT } from '../../src/engine/safety/text';
import { evalOf, fakeClock, FakeLlm, FakeStore, json, q } from '../helpers/fakes';

const POOL = [
  { ...q('g1', 1), text: 'Describe teamwork on a project.' },
  { ...q('g2', 1), text: 'Describe how you handle conflict.' },
  { ...q('sql1', 1), text: 'What is a SQL join?', keywords: ['sql'] },
  { ...q('sql2', 3), text: 'Explain SQL indexing trade-offs.', keywords: ['sql'] },
  { ...q('h1', 3), text: 'Lead a hard negotiation.' },
  { ...q('b1', 1, 'business'), text: 'Handle an angry customer.' },
];

function make(queue: (string | Error)[] = [json(evalOf())], maxQuestions?: number) {
  const llm = new FakeLlm(queue);
  const engine = new InterviewEngine({ llm, store: new FakeStore(POOL), clock: fakeClock, rng: () => 0, ...(maxQuestions ? { maxQuestions } : {}) });
  return { engine, llm };
}
async function begin(e: InterviewEngine, domain = 'it') { e.start(); e.acknowledgeDisclosure(); return e.selectDomain(domain); }

describe('disclosure acknowledged once', () => {
  it('start({disclosureAcknowledged}) skips the click, shows the short notice, lands on domain select', () => {
    const { engine } = make();
    const o = engine.start({ disclosureAcknowledged: true });
    expect(o.status).toBe('DOMAIN_SELECT');
    expect(o.messages[0]).toEqual({ kind: 'info', text: AI_NOTICE_SHORT });
    expect(o.messages.some((m) => m.kind === 'disclosure')).toBe(false);
  });
  it('without the flag the full disclosure still appears', () => {
    expect(make().engine.start().status).toBe('DISCLOSURE');
  });
});

describe('user steers the session', () => {
  it('typing a domain with a focus at domain select starts on that topic', async () => {
    const { engine } = make();
    engine.start({ disclosureAcknowledged: true });
    const o = await engine.submit('IT, SQL');
    expect(o.status).toBe('AWAITING_ANSWER');
    expect(o.question?.id).toBe('sql1');
    expect(o.progress.focus).toBe('sql');
  });

  it('focus mid-question swaps the question without counting a skip', async () => {
    const { engine } = make();
    await begin(engine);
    const o = await engine.submit('ask me about SQL');
    expect(o.status).toBe('AWAITING_ANSWER');
    expect(o.question?.id).toBe('sql1');
    expect(o.progress.skipped).toBe(0);
    expect(o.messages[0]?.kind).toBe('info');
  });

  it('focus with no matching question keeps the current one and says so', async () => {
    const { engine } = make();
    const first = await begin(engine);
    const o = await engine.submit('ask me about kubernetes');
    expect(o.question).toBeUndefined();
    expect(o.status).toBe('AWAITING_ANSWER');
    expect(o.messages[0]?.text).toContain('kubernetes');
    expect(o.progress.focus).toBeNull();
    expect(first.question?.id).toBe('g1');
  });

  it('after feedback, "harder" raises difficulty and moves on', async () => {
    const { engine } = make([json(evalOf({}, 0.6))]); // moderate: difficulty stays 1
    await begin(engine);
    await engine.submit('A real answer with enough substance to be scored.');
    const o = await engine.submit('harder');
    expect(o.progress.difficulty).toBe(2);
    expect(o.status).toBe('AWAITING_ANSWER');
    expect(o.question).toBeDefined();
  });

  it('"easier" at the gentlest level is a no-op with a clear message', async () => {
    const { engine } = make();
    await begin(engine);
    const o = await engine.submit('easier');
    expect(o.progress.difficulty).toBe(1);
    expect(o.messages[0]?.text).toContain('gentlest');
  });

  it('"switch to business" changes domain from a question and asks a business question', async () => {
    const { engine } = make();
    await begin(engine);
    const o = await engine.submit('switch to business');
    expect(o.status).toBe('AWAITING_ANSWER');
    expect(o.question?.domain).toBe('business');
  });

  it('a focus runs out gracefully and falls back to mixed topics', async () => {
    const { engine } = make([json(evalOf({}, 0.6))]);
    await engine.start({ disclosureAcknowledged: true });
    await engine.submit('IT, SQL');                       // sql1
    await engine.submit('Answer one with enough text.');   // feedback
    await engine.submit('next');                           // sql2
    await engine.submit('Answer two with enough text.');
    const o = await engine.submit('next');                 // no SQL left
    expect(o.status).toBe('AWAITING_ANSWER');
    expect(o.progress.focus).toBeNull();
    expect(o.messages[0]?.text).toContain('mixing topics');
  });

  it('"help" lists commands without changing state or calling the model', async () => {
    const { engine, llm } = make();
    await begin(engine);
    const o = await engine.submit('help');
    expect(o.status).toBe('AWAITING_ANSWER');
    expect(o.messages[0]?.text).toContain('ask me about');
    expect(llm.calls).toHaveLength(0);
  });

  it('steering never calls the model', async () => {
    const { engine, llm } = make();
    await begin(engine);
    await engine.submit('ask me about SQL');
    await engine.submit('harder');
    await engine.submit('any topic');
    expect(llm.calls).toHaveLength(0);
  });

  it('a long real answer containing "focus on" is still evaluated, not treated as a command', async () => {
    const { engine, llm } = make();
    await begin(engine);
    const o = await engine.submit('I would focus on understanding what the customer actually needs before proposing any solution at all');
    expect(llm.calls).toHaveLength(1);
    expect(o.status).toBe('FEEDBACK');
  });
});

describe('session progress', () => {
  it('reports answered count, averages and recommendations after an answer', async () => {
    const { engine } = make();
    await begin(engine);
    const o = await engine.submit('A real answer with enough substance to be scored.');
    expect(o.progress.answered).toBe(1);
    expect(o.progress.averages).not.toBeNull();
    expect(o.progress.topRecommendations.length).toBeGreaterThan(0);
    expect(o.messages.map((m) => m.kind)).toEqual(['feedback', 'nudge']);
  });
  it('snapshot round-trips the focus', async () => {
    const { engine } = make();
    await begin(engine);
    await engine.submit('ask me about SQL');
    expect(engine.snapshot()?.focus).toBe('sql');
  });
});
