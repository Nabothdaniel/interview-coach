import type { RelevanceTier } from '../../engine';
import type { ChatItem } from '../useInterview';

export interface QuestionRow { id: number; text: string; state: 'current' | 'answered' | 'skipped'; tier?: RelevanceTier }

/** Display-only: folds the chat transcript into one row per distinct question. No scoring: the tier is the engine's. */
export function deriveQuestions(items: readonly ChatItem[]): QuestionRow[] {
  const rows: QuestionRow[] = [];
  const last = (): QuestionRow | undefined => rows[rows.length - 1];
  for (const it of items) {
    if (it.from !== 'coach') continue;
    if (it.kind === 'question') {
      const l = last();
      if (l && l.state === 'current' && l.text === it.text) continue; // repeated prompt, same question
      if (l && l.state === 'current') l.state = 'skipped';
      rows.push({ id: it.id, text: it.text, state: 'current' });
    } else if (it.kind === 'feedback' && it.feedback) {
      const l = last();
      if (l && l.state === 'current') { l.state = 'answered'; l.tier = it.feedback.contentRelevance.tier; }
    } else if (it.kind === 'summary') {
      const l = last();
      if (l && l.state === 'current') l.state = 'skipped';
    } else if (it.kind === 'prompt_domain' || it.kind === 'distress') {
      const l = last();
      if (l && l.state === 'current') l.state = 'skipped';
    }
  }
  return rows;
}
