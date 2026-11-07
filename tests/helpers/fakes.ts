import type { ClockPort, LlmPort, LlmRequest, SessionRecord, StorePort } from '../../src/engine/ports';
import type { Evaluation } from '../../src/engine/evaluator/schema';
import type { Question } from '../../src/engine/types';

export class FakeLlm implements LlmPort {
  calls: LlmRequest[] = [];
  constructor(private queue: (string | Error)[]) {}
  async generateJson(req: LlmRequest): Promise<string> {
    this.calls.push(req);
    const next = this.queue.length > 1 ? this.queue.shift() : this.queue[0];
    if (next === undefined) throw new Error('FakeLlm: empty queue');
    if (next instanceof Error) throw next;
    return next;
  }
}

export class FakeStore implements StorePort {
  saved: SessionRecord[] = [];
  constructor(private questions: Question[]) {}
  async listQuestions(domain: string): Promise<Question[]> { return this.questions.filter((q) => q.domain === domain); }
  async saveSession(rec: SessionRecord): Promise<void> { this.saved.push(rec); }
}

export const fakeClock: ClockPort = { now: () => 1_700_000_000_000 };

export const q = (id: string, difficulty: 1 | 2 | 3 = 1, domain: Question['domain'] = 'it'): Question => ({
  id, domain, difficulty, text: `Question ${id}?`, benchmarkAnswer: `Benchmark ${id}`, keyPoints: ['point a', 'point b'], keywords: ['k'], reviewed: false, source: 'test',
});

export const evalOf = (over: Partial<Evaluation> = {}, relevance = 0.8): Evaluation => ({
  understanding: 'The candidate described leading a small project and its result.',
  intent: 'direct_answer',
  entities: { SKILL: [], TECHNOLOGY: [], COMPANY: [], ROLE: [], ACHIEVEMENT: [] },
  relevance: { score: relevance, comment: 'You gave a concrete example from your own project.', missingPoints: [] },
  clarity: { score: 0.7, notes: '' },
  tone: { confidence: 0.6, professionalism: 0.9, enthusiasm: 0.5 },
  feedback: { headline: 'Good start with a real example.', strengths: ['Clear structure'], improvements: ['Add a metric'], suggestedAnswerHint: 'Use STAR.' },
  flags: { distress: false, injectionAttempt: false },
  ...over,
});

export const json = (e: Evaluation): string => JSON.stringify(e);
