import type { Domain } from '../types';

/** Things the user can ask for in plain words. Parsed deterministically; the LLM never decides control flow (AGENTS.md §3). */
export type Steer =
  | { kind: 'focus'; topic: string }
  | { kind: 'clear_focus' }
  | { kind: 'harder' }
  | { kind: 'easier' }
  | { kind: 'help' }
  | { kind: 'domain'; domain: Domain; topic?: string };

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();

/** Longest alias first so "business administration" wins over "business". */
const ALIASES: [string, Domain][] = [
  ['general graduate roles', 'graduate'], ['general graduate', 'graduate'], ['graduate roles', 'graduate'], ['fresh graduate', 'graduate'], ['graduate', 'graduate'],
  ['business administration', 'business'], ['business admin', 'business'], ['business', 'business'], ['management', 'business'],
  ['information technology', 'it'], ['technology', 'it'], ['tech', 'it'], ['software', 'it'], ['it', 'it'],
];

const SIMPLE: Record<'help' | 'harder' | 'easier' | 'clear_focus', string[]> = {
  help: ['help', 'what can i say', 'what can i do', 'commands', 'options', 'what can you do'],
  harder: ['harder', 'make it harder', 'harder questions', 'more difficult', 'challenge me', 'give me harder questions'],
  easier: ['easier', 'make it easier', 'easier questions', 'simpler', 'too hard', 'give me easier questions'],
  clear_focus: ['any topic', 'clear focus', 'no focus', 'anything', 'mix it up', 'mix topics', 'random'],
};

const FOCUS_RE = /^(?:(?:please )?(?:ask me|give me|quiz me|i want|i would like|can we do|can we have|let's do|let's practi[sc]e|let's focus on)(?: some)?(?: questions?| a question)?(?: about| on| for| in)?|(?:please )?focus on|(?:please )?practi[sc]e|questions? (?:about|on)) (.{2,40})$/;
const DOMAIN_RE = /^(?:(?:please )?(?:switch to|change to|go to|move to|let's do|i want|practi[sc]e|do)) (?:the )?(.{2,40}?)(?: questions| domain| interview)?$/;

function aliasOf(text: string): Domain | null {
  return ALIASES.find(([a]) => a === text)?.[1] ?? null;
}

/** "it networking" -> { domain: 'it', topic: 'networking' }. Aliases only count at the start of the text. */
function splitDomainPrefix(text: string): { domain: Domain; topic?: string } | null {
  for (const [alias, domain] of ALIASES) {
    if (text === alias) return { domain };
    if (text.startsWith(`${alias} `)) {
      const rest = text.slice(alias.length + 1).replace(/^(?:questions? )?(?:about |on |for |in |focus on |focusing on |with )?/, '').replace(/^the /, '').trim();
      return rest.length >= 2 ? { domain, topic: rest } : { domain };
    }
  }
  return null;
}

/**
 * Whole-message match only, so a real answer is not hijacked by a phrase inside it.
 * `atDomainSelect` additionally accepts a bare domain name ("business") or "IT, networking", which would be too risky mid-answer.
 */
export function routeSteer(text: string, atDomainSelect = false): Steer | null {
  const n = norm(text);
  if (n.length === 0 || n.length > 60) return null;
  for (const k of Object.keys(SIMPLE) as (keyof typeof SIMPLE)[]) {
    if (SIMPLE[k].includes(n)) return { kind: k };
  }
  if (atDomainSelect) {
    const d = splitDomainPrefix(n);
    if (d) return { kind: 'domain', ...d };
  }
  const dm = DOMAIN_RE.exec(n);
  if (dm?.[1]) {
    const d = splitDomainPrefix(dm[1]);
    if (d) return { kind: 'domain', ...d };
  }
  const fm = FOCUS_RE.exec(n);
  if (fm?.[1]) {
    const topic = fm[1].replace(/^(?:the|some|a|an) /, '').trim();
    const d = splitDomainPrefix(topic);
    if (d && d.topic === undefined && aliasOf(topic)) return { kind: 'domain', domain: d.domain };
    if (topic.length >= 2) return { kind: 'focus', topic };
  }
  return null;
}
