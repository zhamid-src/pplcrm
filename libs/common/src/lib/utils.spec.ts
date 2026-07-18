import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RESERVED_SUBDOMAINS, debounce, escapeHtml, sleep, slugifyHandle, slugifyRecordName } from './utils';

describe('slugifyHandle', () => {
  it('lowercases, strips accents, and collapses separators to single hyphens', () => {
    expect(slugifyHandle('My Café — Team!')).toBe('my-cafe-team');
    expect(slugifyHandle('Ñandú  &  Friends')).toBe('nandu-friends');
  });

  it('never emits leading or trailing hyphens', () => {
    expect(slugifyHandle('--Edge Org--')).toBe('edge-org');
    expect(slugifyHandle('!!!Wow!!!')).toBe('wow');
  });

  it('caps at 40 chars without leaving a dangling hyphen', () => {
    const slug = slugifyHandle('a'.repeat(39) + ' more words here');
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('returns an empty string when nothing usable remains (caller must fall back)', () => {
    expect(slugifyHandle('!!! *** !!!')).toBe('');
    expect(slugifyHandle('')).toBe('');
  });

  it('reserved labels stay reserved so tenants cannot shadow infra hosts', () => {
    for (const label of ['app', 'api', 'www', 'auth', 'forms', 'localhost']) {
      expect(RESERVED_SUBDOMAINS.has(label), label).toBe(true);
    }
    expect(RESERVED_SUBDOMAINS.has('riverdale-for-council')).toBe(false);
  });
});

describe('slugifyRecordName', () => {
  it('builds URL slugs from display names', () => {
    expect(slugifyRecordName('Amira Hassan', 'person')).toBe('amira-hassan');
    expect(slugifyRecordName('José Núñez', 'person')).toBe('jose-nunez');
  });

  it('falls back when nothing usable remains', () => {
    expect(slugifyRecordName('***', 'person')).toBe('person');
    expect(slugifyRecordName('', 'household')).toBe('household');
  });

  it('prefixes all-digit results so a slug can never look like a numeric record id', () => {
    expect(slugifyRecordName('12345', 'person')).toBe('person-12345');
  });

  it('caps at 80 chars without a trailing hyphen', () => {
    const slug = slugifyRecordName('word '.repeat(30), 'person');
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('escapeHtml', () => {
  it('escapes every HTML-significant character', () => {
    expect(escapeHtml(`<img src="x" onerror='alert(1)'> & more`)).toBe(
      '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt; &amp; more',
    );
  });

  it('escapes ampersands first so entities are not double-mangled', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires once with the latest args after the quiet period', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('a');
    debounced('b');
    debounced('c');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('fires again for calls in a later window', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced(1);
    vi.advanceTimersByTime(300);
    debounced(2);
    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(2, 2);
  });
});

describe('sleep', () => {
  it('resolves after the given delay', async () => {
    vi.useFakeTimers();
    const done = vi.fn();
    void sleep(500).then(done);

    await vi.advanceTimersByTimeAsync(499);
    expect(done).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
