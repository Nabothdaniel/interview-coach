import { DEFAULT_MAX_QUESTIONS, DOMAINS, START_DIFFICULTY } from '../config';
import { evaluateAnswer } from '../evaluator/evaluate';
import type { RelevanceTier } from '../evaluator/tier';
import { buildFeedback, type Feedback } from '../feedback/build';
import { routeLocal } from '../intent/router';
import { routeSteer, type Steer } from '../intent/steer';
import type { ClockPort, LlmPort, StorePort } from '../ports';
import { matchesTopic } from '../questions/focus';
import { adjustDifficulty, pickNext } from '../questions/selector';
import { AI_DISCLOSURE, AI_NOTICE_SHORT, DISTRESS_MESSAGE, HELP_TEXT } from '../safety/text';
import { detectDistressLocal, sanitizeAnswer } from '../safety/guard';
import { vaderCompound } from '../sentiment/vader';
import { z } from 'zod';
import type { BreakdownRow, CandidateProfile, Difficulty, Domain, FourScores, Question, SessionStatus } from '../types';
import { type SessionEvent, transition } from './machine';

export type PublicQuestion = Pick<Question, 'id' | 'domain' | 'difficulty' | 'text'>;
export type MessageKind = 'disclosure' | 'prompt_domain' | 'question' | 'nudge' | 'feedback' | 'summary' | 'distress' | 'info';
export type ErrorCode = 'session_closed' | 'invalid_state' | 'empty_answer' | 'evaluation_failed' | 'no_questions' | 'invalid_domain';

export interface EngineMessage { kind: MessageKind; text: string }

export interface SessionSummary {
  answered: number;
  skipped: number;
  averages: { relevance: number; clarity: number; confidence: number; professionalism: number } | null;
  topRecommendations: string[];
  /** One row per question asked (answered or skipped), in order. */
  breakdown: BreakdownRow[];
  /** Deterministic self-awareness notes: strongest area, area to work on, trend. */
  insights: string[];
  text: string;
}

/** Where the user is in the session as a whole. Computed by the engine so the UI only displays it. */
export interface SessionProgress {
  domain: Domain | null;
  answered: number;
  skipped: number;
  max: number;
  difficulty: Difficulty;
  focus: string | null;
  averages: SessionSummary['averages'];
  topRecommendations: string[];
}

export interface EngineOutput {
  status: SessionStatus;
  messages: EngineMessage[];
  progress: SessionProgress;
  question?: PublicQuestion;
  feedback?: Feedback;
  tier?: RelevanceTier;
  summary?: SessionSummary;
  code?: ErrorCode;
  truncated?: boolean;
}

export interface EngineDeps {
  llm: LlmPort;
  store: StorePort;
  clock: ClockPort;
  rng?: () => number;
  maxQuestions?: number;
  /** Read at each evaluation so profile edits apply immediately. */
  getProfile?: () => CandidateProfile | null;
}

export interface Turn {
  questionId: string;
  skipped: boolean;
  relevance: number;
  clarity: number;
  confidence: number;
  professionalism: number;
  recommendations: string[];
  questionText: string;
  tier: RelevanceTier | null;
  strength: string | null;
}

const unit = z.number().min(0).max(1);
/** Resume data. Deliberately contains NO answer text, only ids, scores and counters. Validated on load (storage is untrusted). */
export const EngineSnapshotSchema = z.object({
  v: z.literal(1),
  status: z.enum(['DOMAIN_SELECT', 'AWAITING_ANSWER', 'FEEDBACK']),
  domain: z.enum(DOMAINS).nullable(),
  focus: z.string().max(40).nullable().optional(),
  asked: z.array(z.string().max(120)).max(200),
  currentId: z.string().max(120).nullable(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  startedAt: z.number(),
  turns: z.array(z.object({
    questionId: z.string().max(120), skipped: z.boolean(), relevance: unit, clarity: unit, confidence: unit, professionalism: unit,
    recommendations: z.array(z.string().max(300)).max(10),
    questionText: z.string().max(300).optional(), tier: z.enum(['high', 'moderate', 'low']).nullable().optional(), strength: z.string().max(300).nullable().optional(),
  })).max(50),
});
export type EngineSnapshot = z.infer<typeof EngineSnapshotSchema>;

const DOMAIN_PROMPT = 'Which domain would you like to practise? Pick one below, or type it with a focus, for example "IT, networking" or "business, customer service".';
const STEER_HINT = 'Say "next" to continue, or steer me: "ask me about SQL", "harder", "easier", "switch to business". Say "end" for your summary.';
const TIER_LEAD: Record<RelevanceTier, string> = {
  high: 'Strong answer. Here is the detail.',
  moderate: 'Good effort, you are partway there. Here is how to tighten it.',
  low: 'Thanks for having a go. Here is where to focus next.',
};

const scoresOf = (t: Turn): FourScores => ({ relevance: t.relevance, clarity: t.clarity, confidence: t.confidence, professionalism: t.professionalism });
const DIMENSIONS: [keyof FourScores, string][] = [['relevance', 'content relevance'], ['clarity', 'clarity'], ['confidence', 'confidence'], ['professionalism', 'professional tone']];
const pct = (n: number): string => `${Math.round(n * 100)}%`;

/** Plain-language self-awareness notes from the scores. Deterministic and constructive; no model call. */
export function buildInsights(scored: readonly Turn[], skipped: number): string[] {
  const out: string[] = [];
  if (scored.length > 0) {
    const avg = DIMENSIONS.map(([k, label]) => ({ label, v: mean(scored.map((t) => t[k])) }));
    const best = avg.reduce((a, b) => (b.v > a.v ? b : a));
    const worst = avg.reduce((a, b) => (b.v < a.v ? b : a));
    out.push(`Strongest area: ${best.label} (${pct(best.v)}).`);
    if (worst.label !== best.label) out.push(`Best place to improve next: ${worst.label} (${pct(worst.v)}).`);
  }
  const first = scored[0]; const last = scored[scored.length - 1];
  if (first && last && scored.length >= 2) {
    const d = Math.round((last.relevance - first.relevance) * 100);
    if (d >= 10) out.push(`Your content got stronger as you went: +${d} points from your first answer to your latest.`);
    else if (d <= -10) out.push(`Your latest answer was ${-d} points lower on content than your first. Worth checking what changed, such as tiredness or a harder question.`);
  }
  if (skipped > 0) out.push(`You skipped ${skipped} question${skipped === 1 ? '' : 's'}. Those are good candidates to revisit.`);
  return out;
}

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

export class InterviewEngine {
  private status: SessionStatus = 'IDLE';
  private domain: Domain | null = null;
  private pool: Question[] = [];
  private asked = new Set<string>();
  private current: Question | null = null;
  private turns: Turn[] = [];
  private difficulty: Difficulty = START_DIFFICULTY as Difficulty;
  private focus: string | null = null;
  private startedAt: number;
  private readonly maxQuestions: number;

  constructor(private readonly deps: EngineDeps) {
    this.startedAt = deps.clock.now();
    this.maxQuestions = deps.maxQuestions ?? DEFAULT_MAX_QUESTIONS;
  }

  getStatus(): SessionStatus { return this.status; }

  /** Resumable state, or null when there is nothing worth resuming (not started, evaluating, finished, closed). */
  snapshot(): EngineSnapshot | null {
    if (this.status !== 'DOMAIN_SELECT' && this.status !== 'AWAITING_ANSWER' && this.status !== 'FEEDBACK') return null;
    return {
      v: 1, status: this.status, domain: this.domain, focus: this.focus, asked: [...this.asked], currentId: this.current?.id ?? null,
      difficulty: this.difficulty, startedAt: this.startedAt, turns: this.turns.map((t) => ({ ...t })),
    };
  }

  /** Rebuild a session from a validated snapshot. Returns null if it is stale or invalid (caller starts fresh). */
  async restore(raw: unknown): Promise<EngineOutput | null> {
    const parsed = EngineSnapshotSchema.safeParse(raw);
    if (!parsed.success || this.status !== 'IDLE') return null;
    const snap = parsed.data;
    if (snap.status === 'DOMAIN_SELECT' || snap.domain === null) {
      this.status = 'DOMAIN_SELECT';
      return this.out([{ kind: 'info', text: 'Welcome back.' }, { kind: 'prompt_domain', text: DOMAIN_PROMPT }]);
    }
    let pool: Question[];
    try { pool = await this.deps.store.listQuestions(snap.domain); } catch { return null; }
    const current = snap.currentId === null ? null : pool.find((q) => q.id === snap.currentId) ?? null;
    if (current === null) return null;
    this.domain = snap.domain; this.pool = pool; this.asked = new Set(snap.asked); this.turns = snap.turns.map((t) => ({ ...t, questionText: t.questionText ?? '', tier: t.tier ?? null, strength: t.strength ?? null }));
    this.difficulty = snap.difficulty; this.focus = snap.focus ?? null; this.startedAt = snap.startedAt; this.current = current;
    this.status = snap.status;
    if (snap.status === 'FEEDBACK') {
      return this.out([{ kind: 'info', text: 'Welcome back. Your session is where you left it.' }, { kind: 'nudge', text: 'Type "next" for the next question, or "end" to finish.' }]);
    }
    return this.out([{ kind: 'info', text: 'Welcome back. Your session is where you left it.' }, { kind: 'question', text: current.text }],
      { question: { id: current.id, domain: current.domain, difficulty: current.difficulty, text: current.text } });
  }

  private go(e: SessionEvent): void { this.status = transition(this.status, e); }
  private out(messages: EngineMessage[], extra: Partial<Omit<EngineOutput, 'status' | 'messages' | 'progress'>> = {}): EngineOutput {
    return { status: this.status, messages, progress: this.progress(), ...extra };
  }
  private withLead(text: string, o: EngineOutput): EngineOutput {
    return { ...o, messages: [{ kind: 'info', text }, ...o.messages] };
  }
  private err(code: ErrorCode, text: string): EngineOutput {
    return this.out([{ kind: 'info', text }], { code });
  }

  /** `disclosureAcknowledged`: the user already accepted the full disclosure on this account, so show the short notice and go straight to domain choice. */
  start(opts: { disclosureAcknowledged?: boolean } = {}): EngineOutput {
    if (this.status !== 'IDLE') return this.err('invalid_state', 'Session already started.');
    this.go('START');
    if (opts.disclosureAcknowledged === true) {
      this.go('ACK');
      return this.out([{ kind: 'info', text: AI_NOTICE_SHORT }, { kind: 'prompt_domain', text: DOMAIN_PROMPT }]);
    }
    return this.out([{ kind: 'disclosure', text: AI_DISCLOSURE }]);
  }

  acknowledgeDisclosure(): EngineOutput {
    if (this.status === 'CLOSED') return this.err('session_closed', 'This session has ended.');
    if (this.status !== 'DISCLOSURE') return this.err('invalid_state', 'Nothing to acknowledge right now.');
    this.go('ACK');
    return this.out([{ kind: 'prompt_domain', text: DOMAIN_PROMPT }]);
  }

  async selectDomain(domain: string, focus?: string): Promise<EngineOutput> {
    if (this.status === 'CLOSED') return this.err('session_closed', 'This session has ended.');
    if (this.status !== 'DOMAIN_SELECT') return this.err('invalid_state', 'You can choose a domain at the start or via "change domain".');
    if (!(DOMAINS as readonly string[]).includes(domain)) return this.err('invalid_domain', 'Unknown domain.');
    this.domain = domain as Domain;
    this.focus = focus && focus.trim() !== '' ? focus.trim().slice(0, 40) : null;
    this.go('SELECT_DOMAIN');
    try {
      this.pool = await this.deps.store.listQuestions(domain);
    } catch {
      this.pool = [];
    }
    this.asked = new Set();
    this.turns = [];
    this.difficulty = START_DIFFICULTY as Difficulty;
    return this.presentNext();
  }

  async submit(raw: string): Promise<EngineOutput> {
    if (this.status === 'CLOSED') return this.err('session_closed', 'This session has ended.');
    if (this.status === 'EVALUATING') return this.err('invalid_state', 'Still evaluating your last answer.');
    const { text, truncated } = sanitizeAnswer(raw);
    if (text === '') return this.err('empty_answer', 'Please type your answer first.');
    // Safety first, in every non-closed state.
    if (detectDistressLocal(text)) return this.closeForDistress();

    switch (this.status) {
      case 'IDLE':
      case 'DISCLOSURE':
      case 'ASKING':
        return this.err('invalid_state', 'Please follow the on-screen step first.');
      case 'DOMAIN_SELECT': {
        const s = routeSteer(text, true);
        if (s) return this.steer(s);
        return this.out([{ kind: 'nudge', text: 'Pick a domain below, or type one, for example "IT" or "business, customer service".' }]);
      }
      case 'FEEDBACK': {
        const cmd = routeLocal(text);
        if (cmd === 'next' || cmd === 'skip') { this.go('NEXT'); return this.presentNext(); }
        if (cmd === 'end') return this.finish('END');
        if (cmd === 'change_domain') return this.changeDomain();
        const s = routeSteer(text);
        if (s) return this.steer(s);
        return this.out([{ kind: 'nudge', text: STEER_HINT }]);
      }
      case 'SUMMARY': {
        if (routeLocal(text) === 'change_domain') return this.changeDomain();
        const s = routeSteer(text);
        if (s) return this.steer(s);
        return this.out([{ kind: 'nudge', text: 'The session is complete. Say "change domain", "switch to business", or "ask me about SQL" to practise again.' }]);
      }
      case 'AWAITING_ANSWER':
        return this.handleAnswer(text, truncated);
    }
  }

  private async handleAnswer(text: string, truncated: boolean): Promise<EngineOutput> {
    const cmd = routeLocal(text);
    if (cmd === 'skip' || cmd === 'next') return this.skipCurrent();
    if (cmd === 'repeat') { this.go('REPEAT'); return this.questionOutput('Here is the question again:'); }
    if (cmd === 'end') return this.finish('END');
    if (cmd === 'change_domain') return this.changeDomain();
    if (cmd === 'greeting') {
      this.go('NOT_SCORED');
      return this.questionOutput('Hello! When you are ready, please answer the question:');
    }

    const steer = routeSteer(text);
    if (steer) return this.steer(steer);

    const q = this.current;
    if (q === null) return this.err('invalid_state', 'No active question.');
    this.go('SUBMIT');
    const outcome = await evaluateAnswer(this.deps.llm, q, text, this.deps.getProfile?.() ?? null);
    if (!outcome.ok) {
      this.go('EVAL_FAILED');
      return this.out([{ kind: 'info', text: 'I could not evaluate that just now. Please try again, or type "skip".' }], { code: 'evaluation_failed' });
    }
    const ev = outcome.evaluation;
    if (ev.flags.distress) return this.closeForDistress();

    if (ev.intent !== 'direct_answer' && ev.intent !== 'partial_answer') {
      this.go('NOT_SCORED');
      const lead = ev.intent === 'clarification_request'
        ? 'Take your time. Answer in your own words, and use a real example if you can. The question again:'
        : 'Let us stay with the interview question:';
      return this.questionOutput(lead);
    }

    this.go('EVAL_OK');
    const fb = buildFeedback(ev, outcome.tier, vaderCompound(text));
    this.turns.push({
      questionId: q.id, skipped: false, relevance: fb.contentRelevance.score, clarity: fb.communicationClarity.score,
      confidence: fb.confidenceTone.confidence, professionalism: fb.confidenceTone.professionalism, recommendations: fb.recommendations,
      questionText: q.text.slice(0, 300), tier: outcome.tier, strength: (fb.strengths[0] ?? '').slice(0, 300) || null,
    });
    this.difficulty = adjustDifficulty(this.difficulty, fb.contentRelevance.score);
    return this.out([{ kind: 'feedback', text: TIER_LEAD[outcome.tier] }, { kind: 'nudge', text: STEER_HINT }], { feedback: fb, tier: outcome.tier, ...(truncated ? { truncated } : {}) });
  }

  private questionOutput(lead: string): EngineOutput {
    const q = this.current;
    if (q === null) return this.err('invalid_state', 'No active question.');
    return this.out([{ kind: 'nudge', text: lead }, { kind: 'question', text: q.text }], { question: { id: q.id, domain: q.domain, difficulty: q.difficulty, text: q.text } });
  }

  private skipCurrent(): Promise<EngineOutput> | EngineOutput {
    if (this.current) this.turns.push({ questionId: this.current.id, skipped: true, relevance: 0, clarity: 0, confidence: 0, professionalism: 0, recommendations: [], questionText: this.current.text.slice(0, 300), tier: null, strength: null });
    this.go('SKIP');
    return this.presentNext();
  }

  private changeDomain(): EngineOutput {
    this.go('CHANGE_DOMAIN');
    this.current = null;
    return this.out([{ kind: 'prompt_domain', text: DOMAIN_PROMPT }]);
  }

  private pickFrom(focus: string | null): Question | null {
    const pool = focus === null ? this.pool : this.pool.filter((q) => matchesTopic(q, focus));
    return pickNext(pool, this.asked, this.difficulty, this.deps.rng);
  }

  /** Replace the unanswered current question (not counted as a skip). Null if nothing suitable is left. */
  private swapCurrent(lead: string): EngineOutput | null {
    const next = this.pickFrom(this.focus);
    if (next === null) return null;
    this.asked.add(next.id);
    this.current = next;
    this.go('NOT_SCORED');
    return this.out([{ kind: 'info', text: lead }, { kind: 'question', text: next.text }], { question: { id: next.id, domain: next.domain, difficulty: next.difficulty, text: next.text } });
  }

  /** The user is in charge: topic, difficulty and domain follow what they ask for. Deterministic; no model call. */
  private async steer(s: Steer): Promise<EngineOutput> {
    const st = this.status;
    const ready = st === 'AWAITING_ANSWER' || st === 'FEEDBACK';
    switch (s.kind) {
      case 'help':
        return this.out([{ kind: 'info', text: HELP_TEXT }]);
      case 'domain':
        if (st !== 'DOMAIN_SELECT') this.go('CHANGE_DOMAIN');
        this.current = null;
        return this.selectDomain(s.domain, s.topic);
      case 'clear_focus':
        this.focus = null;
        return this.out([{ kind: 'info', text: 'Okay, I will mix topics again.' }]);
      case 'focus': {
        if (st === 'SUMMARY' && this.domain !== null) { this.go('CHANGE_DOMAIN'); this.current = null; return this.selectDomain(this.domain, s.topic); }
        if (!ready) return this.out([{ kind: 'nudge', text: 'Pick a domain first, for example "IT, networking".' }]);
        const prev = this.focus;
        this.focus = s.topic.slice(0, 40);
        if (st === 'AWAITING_ANSWER') {
          const swapped = this.swapCurrent(`Sure, switching to "${this.focus}".`);
          if (swapped) return swapped;
        } else if (this.pickFrom(this.focus) !== null) {
          this.go('NEXT');
          return this.withLead(`Sure, let us look at "${this.focus}".`, this.presentNext());
        }
        this.focus = prev;
        return this.out([{ kind: 'info', text: `I do not have another question on "${s.topic}" yet, so I will stay where we are. Try a broader topic.` }]);
      }
      case 'harder':
      case 'easier': {
        const harder = s.kind === 'harder';
        const next = Math.min(3, Math.max(1, this.difficulty + (harder ? 1 : -1))) as Difficulty;
        if (!ready) return this.out([{ kind: 'nudge', text: 'Pick a domain first, then tell me how hard you want it.' }]);
        if (next === this.difficulty) return this.out([{ kind: 'info', text: harder ? 'This is already the hardest level.' : 'This is already the gentlest level.' }]);
        this.difficulty = next;
        const lead = harder ? 'Okay, stepping it up.' : 'Okay, easing off a little.';
        if (st === 'FEEDBACK') { this.go('NEXT'); return this.withLead(lead, this.presentNext()); }
        return this.swapCurrent(lead) ?? this.out([{ kind: 'info', text: `${lead} It applies from the next question.` }]);
      }
    }
  }

  private breakdown(): BreakdownRow[] {
    return this.turns.map((t) => ({
      questionId: t.questionId, questionText: t.questionText, skipped: t.skipped, tier: t.tier,
      scores: t.skipped ? null : scoresOf(t), strength: t.strength, improvement: t.recommendations[0] ?? null,
    }));
  }

  private progress(): SessionProgress {
    const { answered, skipped, averages, topRecommendations } = this.aggregate();
    return { domain: this.domain, answered, skipped, max: this.maxQuestions, difficulty: this.difficulty, focus: this.focus, averages, topRecommendations };
  }

  private aggregate(): Pick<SessionSummary, 'answered' | 'skipped' | 'averages' | 'topRecommendations'> {
    const scored = this.turns.filter((t) => !t.skipped);
    const skipped = this.turns.length - scored.length;
    if (scored.length === 0) return { answered: 0, skipped, averages: null, topRecommendations: [] };
    const averages = {
      relevance: mean(scored.map((t) => t.relevance)),
      clarity: mean(scored.map((t) => t.clarity)),
      confidence: mean(scored.map((t) => t.confidence)),
      professionalism: mean(scored.map((t) => t.professionalism)),
    };
    const freq = new Map<string, number>();
    for (const t of scored) for (const r of t.recommendations) freq.set(r, (freq.get(r) ?? 0) + 1);
    const topRecommendations = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([r]) => r);
    return { answered: scored.length, skipped, averages, topRecommendations };
  }

  /** Called only when status === 'ASKING'. */
  private presentNext(): EngineOutput {
    if (this.turns.length >= this.maxQuestions) return this.finish('FINISH');
    let lead: EngineMessage[] = [];
    let next = this.pickFrom(this.focus);
    if (next === null && this.focus !== null) {
      const topic = this.focus;
      this.focus = null;
      next = this.pickFrom(null);
      if (next !== null) lead = [{ kind: 'info', text: `That is all I have on "${topic}" for now, so I am mixing topics again.` }];
    }
    if (next === null) {
      if (this.turns.length === 0) {
        this.go('NO_QUESTIONS');
        return this.err('no_questions', 'No questions are available for that domain right now. Please choose another.');
      }
      return this.finish('FINISH');
    }
    this.asked.add(next.id);
    this.current = next;
    this.go('QUESTION_SHOWN');
    return this.out([...lead, { kind: 'question', text: next.text }], { question: { id: next.id, domain: next.domain, difficulty: next.difficulty, text: next.text } });
  }

  private finish(event: 'END' | 'FINISH'): EngineOutput {
    this.go(event);
    this.current = null;
    const summary = this.buildSummary();
    // Persist only via StorePort (which must no-op unless the user opted in). Failure never blocks the summary.
    if (summary.averages && this.domain) {
      void this.deps.store.saveSession({
        startedAt: this.startedAt,
        domain: this.domain,
        scores: this.turns.filter((t) => !t.skipped).map(scoresOf),
        breakdown: this.breakdown().map(({ strength: _s, improvement: _i, ...persisted }) => persisted),
        summary: summary.text,
      }).catch(() => undefined);
    }
    return this.out([{ kind: 'summary', text: summary.text }], { summary });
  }

  private closeForDistress(): EngineOutput {
    this.go('DISTRESS');
    this.current = null;
    return this.out([{ kind: 'distress', text: DISTRESS_MESSAGE }]);
  }

  private buildSummary(): SessionSummary {
    const { answered, skipped, averages, topRecommendations } = this.aggregate();
    if (averages === null) {
      return { answered: 0, skipped, averages: null, topRecommendations: [], breakdown: this.breakdown(), insights: buildInsights([], skipped), text: 'No answers were scored this session. Come back and try again whenever you are ready.' };
    }
    const text = `You answered ${answered} question${answered === 1 ? '' : 's'}${skipped ? ` and skipped ${skipped}` : ''}. ` +
      `Average content relevance ${pct(averages.relevance)}, clarity ${pct(averages.clarity)}, confidence ${pct(averages.confidence)}, professionalism ${pct(averages.professionalism)}.`;
    return { answered, skipped, averages, topRecommendations, breakdown: this.breakdown(), insights: buildInsights(this.turns.filter((t) => !t.skipped), skipped), text };
  }
}
