import { describe, expect, it } from 'vitest';

import { articleToMarkdown, blockToMarkdown } from './help-markdown';

import type { HelpArticle } from './help-types';

describe('blockToMarkdown', () => {
  it('renders a paragraph and preserves inline markup verbatim', () => {
    expect(blockToMarkdown({ kind: 'p', text: 'See **People** at [people](/people) and `code`.' })).toBe(
      'See **People** at [people](/people) and `code`.',
    );
  });

  it('renders an h2 as a level-two heading', () => {
    expect(blockToMarkdown({ kind: 'h2', id: 'setup', text: 'Setup' })).toBe('## Setup');
  });

  it('renders an unordered list with dashes', () => {
    expect(blockToMarkdown({ kind: 'list', items: ['alpha', 'beta'] })).toBe('- alpha\n- beta');
  });

  it('renders an ordered list with numbers', () => {
    expect(blockToMarkdown({ kind: 'list', items: ['first', 'second'], ordered: true })).toBe('1. first\n2. second');
  });

  it('renders steps as a numbered list with bold titles and details', () => {
    expect(
      blockToMarkdown({
        kind: 'steps',
        items: [{ title: 'Open it', detail: 'like this' }, { title: 'Save it' }],
      }),
    ).toBe('1. **Open it** — like this\n2. **Save it**');
  });

  it('renders a callout as a blockquote', () => {
    expect(blockToMarkdown({ kind: 'callout', tone: 'tip', title: 'Tip', text: 'be careful' })).toBe(
      '> **Tip** — be careful',
    );
  });

  it('renders keys as a GFM table', () => {
    expect(
      blockToMarkdown({
        kind: 'keys',
        rows: [
          { keys: ['J'], action: 'next record' },
          { keys: ['Ctrl', 'S'], action: 'save' },
        ],
      }),
    ).toBe('| Keys | Action |\n| --- | --- |\n| `J` | next record |\n| `Ctrl` `S` | save |');
  });
});

describe('articleToMarkdown', () => {
  it('renders title, summary, and blocks separated by blank lines', () => {
    const article: HelpArticle = {
      id: 'welcome',
      category: 'getting-started',
      title: 'Welcome',
      summary: 'A quick tour.',
      keywords: [],
      blocks: [
        { kind: 'p', text: 'Hello.' },
        { kind: 'h2', id: 'next', text: 'Next steps' },
      ],
    };
    expect(articleToMarkdown(article)).toBe('# Welcome\n\nA quick tour.\n\nHello.\n\n## Next steps');
  });
});
