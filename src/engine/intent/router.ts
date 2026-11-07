export type LocalCommand = 'skip' | 'repeat' | 'end' | 'next' | 'change_domain' | 'greeting';

const norm = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const TABLE: Record<LocalCommand, string[]> = {
  skip: ['skip', 'skip question', 'skip this', 'skip this question', 'pass'],
  repeat: ['repeat', 'repeat question', 'repeat the question', 'say again', 'again', 'can you repeat', 'can you repeat the question'],
  end: ['end', 'end session', 'end interview', 'end the interview', 'stop', 'quit', 'finish', 'i want to stop'],
  next: ['next', 'next question', 'continue', 'go on', 'ok next'],
  change_domain: ['change domain', 'change topic', 'switch domain', 'change field', 'change category'],
  greeting: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'thanks', 'thank you', 'bye', 'goodbye'],
};

const LOOKUP = new Map<string, LocalCommand>(
  (Object.entries(TABLE) as [LocalCommand, string[]][]).flatMap(([cmd, phrases]) => phrases.map((p) => [p, cmd] as const)),
);

/** Whole-message match only, so a real answer containing "skip" or "stop" is never hijacked. */
export function routeLocal(text: string): LocalCommand | null {
  const n = norm(text);
  if (n.length === 0 || n.length > 40) return null;
  return LOOKUP.get(n) ?? null;
}
