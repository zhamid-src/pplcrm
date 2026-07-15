import { describe, expect, it } from 'vitest';

import { isDisposableEmail } from './disposable-email-domains';

describe('isDisposableEmail', () => {
  it('flags well-known disposable services', () => {
    expect(isDisposableEmail('spammer@mailinator.com')).toBe(true);
    expect(isDisposableEmail('x@10minutemail.com')).toBe(true);
    expect(isDisposableEmail('x@yopmail.com')).toBe(true);
    expect(isDisposableEmail('x@guerrillamail.com')).toBe(true);
    expect(isDisposableEmail('x@temp-mail.org')).toBe(true);
  });

  it('is case- and whitespace-insensitive', () => {
    expect(isDisposableEmail('  X@MAILINATOR.COM  ')).toBe(true);
  });

  it('catches subdomain inboxes of a listed service', () => {
    expect(isDisposableEmail('x@inbox.mailinator.com')).toBe(true);
  });

  it('passes ordinary providers and org domains', () => {
    expect(isDisposableEmail('volunteer@gmail.com')).toBe(false);
    expect(isDisposableEmail('director@foodbank.org')).toBe(false);
    expect(isDisposableEmail('team@riverside-council.gov')).toBe(false);
  });

  it('does not false-positive on lookalike parents', () => {
    // 'mail.tm' is listed; 'mail.tmx.com' must not match via suffix confusion.
    expect(isDisposableEmail('x@mail.tmx.com')).toBe(false);
  });

  it('handles malformed input safely', () => {
    expect(isDisposableEmail('not-an-email')).toBe(false);
    expect(isDisposableEmail('')).toBe(false);
  });
});
