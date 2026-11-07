import type { Question } from '../types';

const STOP = new Set(['the', 'and', 'for', 'question', 'questions', 'about', 'interview', 'skills', 'skill', 'some', 'any', 'with']);

/** Deterministic topic match against the question text, keywords and key points. Tokens shorter than 3 chars are ignored. */
export function matchesTopic(q: Question, topic: string): boolean {
  const tokens = topic.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOP.has(t));
  if (tokens.length === 0) return false;
  const hay = [q.text, ...q.keywords, ...q.keyPoints].join(' ').toLowerCase();
  return tokens.some((t) => hay.includes(t));
}
