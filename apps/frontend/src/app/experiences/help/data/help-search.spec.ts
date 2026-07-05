import { describe, expect, it } from 'vitest';

import { highlightTerms, searchHelp } from './help-search';

describe('searchHelp', () => {
  it('returns nothing for an empty or blank query', () => {
    expect(searchHelp('')).toEqual([]);
    expect(searchHelp('   ')).toEqual([]);
  });

  it('is case-insensitive', () => {
    const lower = searchHelp('newsletter');
    const upper = searchHelp('NEWSLETTER');
    expect(lower.length).toBeGreaterThan(0);
    expect(upper.map((r) => r.article.id)).toEqual(lower.map((r) => r.article.id));
  });

  it('ranks a title match above a body-only match', () => {
    const results = searchHelp('duplicates');
    expect(results.length).toBeGreaterThan(1);
    expect(results[0].article.id).toBe('duplicates');
  });

  it('finds articles through keywords that are not in the copy', () => {
    const results = searchHelp('excel');
    expect(results.map((r) => r.article.id)).toContain('import');
  });

  it('requires every term to match somewhere (AND semantics)', () => {
    const both = searchHelp('merge duplicates');
    expect(both.length).toBeGreaterThan(0);
    for (const result of both) {
      expect(searchHelp('merge').map((r) => r.article.id)).toContain(result.article.id);
      expect(searchHelp('duplicates').map((r) => r.article.id)).toContain(result.article.id);
    }
    expect(searchHelp('merge zzzznothing')).toEqual([]);
  });

  it('boosts a full phrase found in the title', () => {
    const results = searchHelp('keyboard shortcuts');
    expect(results[0]?.article.id).toBe('shortcuts');
  });

  it('highlights the match when the term occurs in the title, summary, or body', () => {
    const result = searchHelp('tags').find((r) => r.article.id === 'tags-issues');
    if (!result) throw new Error('expected tags-issues in results for "tags"');
    const hasHit = result.snippet.some((seg) => seg.hit) || result.title.some((seg) => seg.hit);
    expect(hasHit).toBe(true);
  });

  it('never returns an empty snippet', () => {
    for (const result of searchHelp('tags')) {
      const text = result.snippet.map((seg) => seg.text).join('');
      expect(text.trim().length, `${result.article.id} snippet is empty`).toBeGreaterThan(0);
    }
  });
});

describe('highlightTerms', () => {
  it('marks every occurrence and reassembles to the original text', () => {
    const segments = highlightTerms('Tag the tags you tagged', ['tag']);
    expect(segments.map((s) => s.text).join('')).toBe('Tag the tags you tagged');
    expect(segments.filter((s) => s.hit).map((s) => s.text)).toEqual(['Tag', 'tag', 'tag']);
  });

  it('returns one plain segment when nothing matches', () => {
    expect(highlightTerms('hello world', ['zzz'])).toEqual([{ hit: false, text: 'hello world' }]);
  });

  it('prefers the longest term at the same position', () => {
    const segments = highlightTerms('newsletters', ['news', 'newsletter']);
    expect(segments[0]).toEqual({ hit: true, text: 'newsletter' });
  });
});
