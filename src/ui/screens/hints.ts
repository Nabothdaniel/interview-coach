import { TIER_HIGH_MIN, TIER_MODERATE_MIN } from '../../engine';

/** Plain-language explanations shown in tooltips. Display text only. */
const p = (n: number): string => `${Math.round(n * 100)}%`;

export const DIM_TIP = {
  relevance: 'Did your answer address what the question was really asking? Judged on content, not on wording.',
  clarity: 'How clear your meaning was. Regional English, Pidgin influence and non-native grammar are not marked down when your meaning is clear.',
  confidence: 'How sure you sound, from your word choice (the AI’s reading blended with a local sentiment check). A rough cue, not a personality test.',
  tone: 'How professional your wording sounded for an interview.',
} as const;

export const TIER_TIP = {
  high: `Strong: content relevance of ${p(TIER_HIGH_MIN)} or more.`,
  moderate: `Partial: content relevance from ${p(TIER_MODERATE_MIN)} to just under ${p(TIER_HIGH_MIN)}.`,
  low: `Needs focus: content relevance under ${p(TIER_MODERATE_MIN)}. This is practice feedback, not a verdict on you.`,
} as const;

export const WIDGET_TIP = {
  session: 'How far you are through this round of questions. Skipped questions count towards the total. The level goes up after a strong answer and down after a weak one, and you can say "harder" or "easier" any time.',
  doing: 'Your scores averaged across every answer this session, so one bad answer does not define you. Hover a score in the feedback card to see what it measures.',
  next: 'The improvements the coach mentioned most often across your answers. Fix these first.',
  save: 'Off by default. When on, your scores, question-by-question breakdown and role are saved to your account so Your history works. Your answer text is never saved.',
} as const;

export const CHIP_TIP = {
  repeat: 'Hear the question again.',
  skip: 'Move on to another question. It counts as skipped.',
  next: 'Go to the next question.',
  harder: 'Switch to harder questions from here.',
  easier: 'Switch to gentler questions from here.',
  end: 'Finish now and see your summary and question-by-question breakdown.',
  retry: 'Send your last answer again.',
  again: 'Begin a new practice round.',
} as const;
