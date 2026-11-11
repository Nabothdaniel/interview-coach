import { describe, expect, it } from 'vitest';
import { appendTranscript, tidyTranscript } from '../../src/ui/speechText';

describe('tidyTranscript', () => {
  it('fixes spacing, "i" and sentence capitals', () => expect(tidyTranscript('i  think i can do it . then i would  ask')).toBe('I think I can do it. Then I would ask.'));
  it('fixes i-contractions', () => expect(tidyTranscript("i'm ready and i've prepared")).toBe("I'm ready and I've prepared."));
  it('does not add a full stop to very short text', () => expect(tidyTranscript('yes please')).toBe('Yes please'));
  it('keeps filler words and dialect untouched (fairness, hesitation is assessed)', () => {
    expect(tidyTranscript('um i dey try my best for this work')).toBe('Um I dey try my best for this work.');
  });
  it('returns empty for blank input', () => expect(tidyTranscript('   ')).toBe(''));
});

describe('appendTranscript', () => {
  it('adds one space between existing text and the transcript', () => expect(appendTranscript('Hello. ', 'my name is Ada and i work', 100)).toBe('Hello. My name is Ada and I work.'));
  it('respects the max length', () => expect(appendTranscript('', 'a long sentence goes here ok', 10).length).toBe(10));
  it('leaves existing text alone for an empty transcript', () => expect(appendTranscript('keep', '  ', 100)).toBe('keep'));
});
