import { describe, expect, it } from 'vitest';
import { routeSteer } from '../../src/engine/intent/steer';
import { matchesTopic } from '../../src/engine/questions/focus';
import { q } from '../helpers/fakes';

describe('routeSteer', () => {
  it.each([
    ['ask me about SQL', { kind: 'focus', topic: 'sql' }],
    ['Focus on teamwork please'.replace(' please', ''), { kind: 'focus', topic: 'teamwork' }],
    ["let's practise customer service", { kind: 'focus', topic: 'customer service' }],
    ['can we do questions about the NYSC', { kind: 'focus', topic: 'nysc' }],
    ['harder', { kind: 'harder' }],
    ['Make it easier!', { kind: 'easier' }],
    ['any topic', { kind: 'clear_focus' }],
    ['what can I say?', { kind: 'help' }],
    ['switch to business', { kind: 'domain', domain: 'business' }],
    ['switch to business administration questions', { kind: 'domain', domain: 'business' }],
    ['ask me about IT', { kind: 'domain', domain: 'it' }],
  ])('%s', (text, expected) => expect(routeSteer(text)).toEqual(expected));

  it('does not hijack a real answer that merely contains a trigger word', () => {
    expect(routeSteer('I would focus on the customer first and then escalate to my manager if needed, because trust matters')).toBeNull();
    expect(routeSteer('I make the team work harder by setting clear goals and recognising effort every week in meetings')).toBeNull();
  });

  it('accepts bare domain names only at domain select', () => {
    expect(routeSteer('business')).toBeNull();
    expect(routeSteer('it')).toBeNull();
    expect(routeSteer('business', true)).toEqual({ kind: 'domain', domain: 'business' });
    expect(routeSteer('IT, networking', true)).toEqual({ kind: 'domain', domain: 'it', topic: 'networking' });
    expect(routeSteer('business administration customer service', true)).toEqual({ kind: 'domain', domain: 'business', topic: 'customer service' });
  });

  it('ignores empty and very long text', () => {
    expect(routeSteer('')).toBeNull();
    expect(routeSteer('ask me about ' + 'x'.repeat(80))).toBeNull();
  });
});

describe('matchesTopic', () => {
  const sql = { ...q('s1'), text: 'Explain a SQL join.', keywords: ['database'] };
  it('matches on text, keywords and key points', () => {
    expect(matchesTopic(sql, 'sql')).toBe(true);
    expect(matchesTopic(sql, 'databases')).toBe(false); // exact-substring, deterministic
    expect(matchesTopic(sql, 'database')).toBe(true);
    expect(matchesTopic(sql, 'point a')).toBe(true);
  });
  it('ignores stop words and very short tokens', () => {
    expect(matchesTopic(sql, 'the questions')).toBe(false);
    expect(matchesTopic(sql, 'a')).toBe(false);
  });
});
