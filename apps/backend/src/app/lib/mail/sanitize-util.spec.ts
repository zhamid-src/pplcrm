import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitize-util';

describe('sanitizeHtml', () => {
  it('should return empty string for null, undefined, or empty inputs', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml('')).toBe('');
  });

  it('should strip out dangerous script tags', () => {
    const dirty = '<p>Hello</p><script>alert("XSS")</script>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toBe('<p>Hello</p>');
  });

  it('should strip out dangerous event handler attributes', () => {
    const dirty = '<p onclick="alert(1)" onload="doBadThings()">Click me</p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toBe('<p>Click me</p>');
  });

  it('should remove javascript: hrefs and sources', () => {
    const dirty = '<a href="javascript:alert(1)">Click</a><img src="javascript:alert(2)">';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('javascript:');
    expect(clean).toBe('<a>Click</a><img>');
  });

  it('should remove iframes and other unauthorized tags', () => {
    const dirty = '<div><iframe src="https://unsafe.site"></iframe><p>Safe content</p></div>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('iframe');
    expect(clean).toBe('<div><p>Safe content</p></div>');
  });

  it('should preserve safe styling, formatting, and layout tags', () => {
    const dirty =
      '<h1>My Title</h1><div style="color: red; font-weight: bold;">Styled Text</div><table><tr><td>Cell</td></tr></table>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<h1>My Title</h1>');
    expect(clean).toContain('style="color: red; font-weight: bold;"');
    expect(clean).toContain('<table>');
    expect(clean).toContain('<td>Cell</td>');
  });
});
