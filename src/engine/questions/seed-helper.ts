import type { Domain, Question } from '../types';

/** Builds one starter question. Every seed is `reviewed:true`: checked by the project owner on 2026-11-11 (this is not a claim of HR-professional validation). */
export const seedQ = (id: string, domain: Domain, difficulty: 1 | 2 | 3, text: string, benchmarkAnswer: string, keyPoints: string[], keywords: string[]): Question =>
  ({ id, domain, difficulty, text, benchmarkAnswer, keyPoints, keywords, reviewed: true, source: 'seed-v1' });
