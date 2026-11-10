import type { Domain, Question } from '../types';

/** Builds one starter question. Every seed is `reviewed:false` (not validated by an HR professional). */
export const seedQ = (id: string, domain: Domain, difficulty: 1 | 2 | 3, text: string, benchmarkAnswer: string, keyPoints: string[], keywords: string[]): Question =>
  ({ id, domain, difficulty, text, benchmarkAnswer, keyPoints, keywords, reviewed: false, source: 'seed-v1' });
