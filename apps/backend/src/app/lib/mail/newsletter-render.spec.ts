import { describe, expect, it } from 'vitest';

import {
  extractMergeTokens,
  injectPreheader,
  renderNewsletterHtml,
  resolveMergeSubstitutions,
  rewriteRelativeImageUrls,
  stripEditorBlockData,
} from './newsletter-render';

describe('stripEditorBlockData', () => {
  it('removes the editor block-model JSON comment', () => {
    const html = '<p>Hi</p><!-- PPLCRM_VISUAL_BLOCKS_DATA: %5B%7B%22a%22%3A1%7D%5D --><p>Bye</p>';
    expect(stripEditorBlockData(html)).toBe('<p>Hi</p><p>Bye</p>');
  });

  it('removes multiple/multiline block comments', () => {
    const html = '<!-- PPLCRM_VISUAL_BLOCKS_DATA: a\nb\nc -->X<!-- PPLCRM_VISUAL_BLOCKS_DATA: d -->Y';
    expect(stripEditorBlockData(html)).toBe('XY');
  });

  it('leaves ordinary HTML untouched', () => {
    expect(stripEditorBlockData('<p>no marker</p>')).toBe('<p>no marker</p>');
  });
});

describe('rewriteRelativeImageUrls', () => {
  const base = 'https://app.example.com';

  it('rewrites a relative assets path to absolute', () => {
    const out = rewriteRelativeImageUrls('<img src="assets/newsletters/x.png">', base);
    expect(out).toBe('<img src="https://app.example.com/assets/newsletters/x.png">');
  });

  it('rewrites a root-relative path', () => {
    const out = rewriteRelativeImageUrls('<img src="/assets/newsletters/x.png">', base);
    expect(out).toBe('<img src="https://app.example.com/assets/newsletters/x.png">');
  });

  it('rewrites a ./-prefixed path', () => {
    const out = rewriteRelativeImageUrls('<img src="./assets/x.png">', base);
    expect(out).toBe('<img src="https://app.example.com/assets/x.png">');
  });

  it('leaves absolute, protocol-relative, data and cid URLs untouched', () => {
    const html =
      '<img src="https://cdn.example.com/a.png"><img src="//cdn/b.png"><img src="data:image/png;base64,AAAA"><img src="cid:logo">';
    expect(rewriteRelativeImageUrls(html, base)).toBe(html);
  });

  it('strips a trailing slash on the base url and preserves other attributes/quotes', () => {
    const out = rewriteRelativeImageUrls(`<img alt="logo" src='assets/x.png' width="10">`, 'https://app.example.com/');
    expect(out).toBe(`<img alt="logo" src='https://app.example.com/assets/x.png' width="10">`);
  });
});

describe('injectPreheader', () => {
  it('injects a hidden preheader right after <body>', () => {
    const out = injectPreheader('<html><body><p>Hi</p></body></html>', 'Your weekly update');
    expect(out).toContain('<body><div data-pc-preheader');
    expect(out).toContain('Your weekly update');
    expect(out.indexOf('data-pc-preheader')).toBeLessThan(out.indexOf('<p>Hi</p>'));
  });

  it('prepends when there is no <body> tag', () => {
    const out = injectPreheader('<p>Hi</p>', 'Preview');
    expect(out.startsWith('<div data-pc-preheader')).toBe(true);
  });

  it('is a no-op when preview text is empty or whitespace', () => {
    expect(injectPreheader('<p>Hi</p>', '')).toBe('<p>Hi</p>');
    expect(injectPreheader('<p>Hi</p>', '   ')).toBe('<p>Hi</p>');
    expect(injectPreheader('<p>Hi</p>', null)).toBe('<p>Hi</p>');
  });

  it('is idempotent (does not double-inject)', () => {
    const once = injectPreheader('<body>X</body>', 'Preview');
    const twice = injectPreheader(once, 'Preview');
    expect(twice).toBe(once);
  });

  it('escapes HTML in the preview text', () => {
    const out = injectPreheader('<body>X</body>', '<b>hi</b> & "q"');
    expect(out).toContain('&lt;b&gt;hi&lt;/b&gt; &amp; &quot;q&quot;');
  });
});

describe('renderNewsletterHtml', () => {
  it('composes strip + image rewrite + preheader', () => {
    const html = '<html><body><img src="assets/n/x.png"><!-- PPLCRM_VISUAL_BLOCKS_DATA: z --></body></html>';
    const out = renderNewsletterHtml(html, { baseUrl: 'https://app.example.com', previewText: 'Hello' });
    expect(out).not.toContain('PPLCRM_VISUAL_BLOCKS_DATA');
    expect(out).toContain('https://app.example.com/assets/n/x.png');
    expect(out).toContain('data-pc-preheader');
    expect(out).toContain('Hello');
  });
});

describe('extractMergeTokens', () => {
  it('extracts distinct tokens across multiple content strings', () => {
    const tokens = extractMergeTokens('Hi {FirstName}', '<p>{FirstName} {LastName|there}</p>', null);
    expect(tokens).toEqual([
      { token: '{FirstName}', field: 'FirstName', fallback: '' },
      { token: '{LastName|there}', field: 'LastName', fallback: 'there' },
    ]);
  });

  it('returns an empty array when there are no tokens', () => {
    expect(extractMergeTokens('no tokens here', undefined)).toEqual([]);
  });
});

describe('resolveMergeSubstitutions', () => {
  const recipient = { email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe', phone: '555-1234' };

  it('resolves the supported fields', () => {
    const tokens = extractMergeTokens('{FirstName} {LastName} {Name} {Email} {Phone}');
    const subs = resolveMergeSubstitutions(tokens, recipient);
    expect(subs['{FirstName}']).toBe('Jane');
    expect(subs['{LastName}']).toBe('Doe');
    expect(subs['{Name}']).toBe('Jane Doe');
    expect(subs['{Email}']).toBe('jane@example.com');
    expect(subs['{Phone}']).toBe('555-1234');
  });

  it('uses the fallback when the field is empty', () => {
    const tokens = extractMergeTokens('{FirstName|friend}');
    const subs = resolveMergeSubstitutions(tokens, { email: 'x@y.com', firstName: null });
    expect(subs['{FirstName|friend}']).toBe('friend');
  });

  it('falls back to empty string for an unknown field with no fallback', () => {
    const tokens = extractMergeTokens('{Unknown}');
    const subs = resolveMergeSubstitutions(tokens, recipient);
    expect(subs['{Unknown}']).toBe('');
  });

  it('escapes HTML-breaking characters in resolved values', () => {
    const tokens = extractMergeTokens('{FirstName}');
    const subs = resolveMergeSubstitutions(tokens, { email: 'x@y.com', firstName: '<b>A</b> & "B"' });
    expect(subs['{FirstName}']).toBe('&lt;b&gt;A&lt;/b&gt; &amp; &quot;B&quot;');
  });

  it('builds Name from only the available part', () => {
    const tokens = extractMergeTokens('{Name}');
    expect(resolveMergeSubstitutions(tokens, { email: 'x@y.com', firstName: 'Solo' })['{Name}']).toBe('Solo');
  });
});
