import { describe, expect, it } from 'vitest';

import { blockToPlainText, parseHelpInline, readingMinutes, stripHelpInline } from './help-types';

import type { HelpArticle, HelpBlock } from './help-types';

describe('parseHelpInline', () => {
  it('returns plain text untouched', () => {
    expect(parseHelpInline('just words')).toEqual([{ kind: 'text', text: 'just words' }]);
  });

  it('parses bold, code, and internal links', () => {
    const segments = parseHelpInline('Use **bold** and `code` then [People](/people).');
    expect(segments).toEqual([
      { kind: 'text', text: 'Use ' },
      { kind: 'bold', text: 'bold' },
      { kind: 'text', text: ' and ' },
      { kind: 'code', text: 'code' },
      { kind: 'text', text: ' then ' },
      { kind: 'link', route: '/people', text: 'People' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('keeps non-internal link targets as literal text', () => {
    const segments = parseHelpInline('See [docs](https://example.com) now');
    expect(segments).toEqual([
      { kind: 'text', text: 'See ' },
      { kind: 'text', text: '[docs](https://example.com)' },
      { kind: 'text', text: ' now' },
    ]);
  });

  it('leaves unterminated markers alone', () => {
    expect(parseHelpInline('a ** b ` c [d](e')).toEqual([{ kind: 'text', text: 'a ** b ` c [d](e' }]);
  });
});

describe('stripHelpInline', () => {
  it('strips markers but keeps the words', () => {
    expect(stripHelpInline('Use **bold** and [People](/people)')).toBe('Use bold and People');
  });
});

describe('blockToPlainText', () => {
  it('extracts text from every block kind', () => {
    const blocks: HelpBlock[] = [
      { kind: 'p', text: 'para **one**' },
      { kind: 'h2', id: 'x', text: 'heading' },
      { kind: 'list', items: ['alpha', '`beta`'] },
      { kind: 'steps', items: [{ title: 'do it', detail: 'like this' }] },
      { kind: 'callout', tone: 'info', title: 'note', text: 'careful' },
      { kind: 'keys', rows: [{ keys: ['J'], action: 'next record' }] },
    ];
    const texts = blocks.map(blockToPlainText);
    expect(texts[0]).toBe('para one');
    expect(texts[1]).toBe('heading');
    expect(texts[2]).toContain('alpha');
    expect(texts[2]).toContain('beta');
    expect(texts[3]).toContain('do it');
    expect(texts[3]).toContain('like this');
    expect(texts[4]).toContain('note');
    expect(texts[4]).toContain('careful');
    expect(texts[5]).toContain('J');
    expect(texts[5]).toContain('next record');
  });
});

describe('readingMinutes', () => {
  it('never reports less than one minute', () => {
    const tiny: HelpArticle = {
      id: 't',
      category: 'getting-started',
      title: 'Tiny',
      summary: 'Small.',
      keywords: [],
      blocks: [{ kind: 'p', text: 'Short.' }],
    };
    expect(readingMinutes(tiny)).toBe(1);
  });
});
