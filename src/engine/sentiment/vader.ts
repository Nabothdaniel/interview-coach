import { SentimentIntensityAnalyzer } from 'vader-sentiment';

/** Local VADER compound score in [-1, 1] (thesis §3.3.3 step 5). */
export function vaderCompound(text: string): number {
  return SentimentIntensityAnalyzer.polarity_scores(text).compound;
}
