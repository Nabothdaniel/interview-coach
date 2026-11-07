/** Dev tool: prints the model's structured feedback for a few answers so a human can judge specificity. Run: npm run eval:sample */
import { appendFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { buildFeedback } from '../../src/engine/feedback/build';
import { evaluateAnswer } from '../../src/engine/evaluator/evaluate';
import { SEED_QUESTIONS } from '../../src/engine/questions/seed';
import { KEY, llm } from './llm';

const byId = (id: string) => { const q = SEED_QUESTIONS.find((x) => x.id === id); if (!q) throw new Error(id); return q; };
const CASES: { label: string; id: string; answer: string }[] = [
  { label: 'honest money-driven choice (reconstructed)', id: 'seed-biz-1', answer: 'To be honest I chose business administration because it was what I could afford at the time. My family could not pay for the course I really wanted. In five years I just want a stable job.' },
  { label: 'strong, specific', id: 'seed-biz-2', answer: 'I list everything due, rank by deadline and impact, and tell my supervisor early if two things clash. During my internship I had a report and a stock count due the same Friday, so I did the count first, agreed a Monday morning slot for the report, and checked in on Thursday.' },
  { label: 'Pidgin-flavoured but strong', id: 'seed-grad-3', answer: 'For my final year project we be four, I be the team lead. I share the work for board, we dey meet two times for week, and when one guy dey struggle I sit with am. We finish before deadline and we score 78 percent, highest for class.' },
];

const OUT = process.env.SAMPLE_OUT ?? 'sample-output.txt';
const log = (t: string): void => appendFileSync(OUT, t + '\n');

describe.skipIf(!KEY)('sample feedback', () => {
  it('prints structured feedback', async () => {
    writeFileSync(OUT, '');
    for (const c of CASES) {
      const r = await evaluateAnswer(llm, byId(c.id), c.answer);
      log(`\n===== ${c.label}\nQ: ${byId(c.id).text}\nA: ${c.answer}`);
      if (!r.ok) { log(`FAILED ${r.reason} ${r.detail ?? ''}`); continue; }
      const fb = buildFeedback(r.evaluation, r.tier, 0);
      log(JSON.stringify({ understood: fb.understood, headline: fb.headline, tier: fb.contentRelevance.tier, relevance: fb.contentRelevance.score, relevanceText: fb.contentRelevance.text, clarity: fb.communicationClarity.score, clarityText: fb.communicationClarity.text, strengths: fb.strengths, improvements: fb.recommendations, couldAdd: fb.contentRelevance.missingPoints, hint: fb.hint }, null, 2));
      await new Promise((res) => setTimeout(res, 4000));
    }
  });
});
