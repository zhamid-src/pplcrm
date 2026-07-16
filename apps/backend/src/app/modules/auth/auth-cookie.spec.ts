import { describe, it, expect } from 'vitest';

import { sharedParentDomain } from './auth-cookie';

/**
 * The pc_signed_in presence cookie must be scoped to the common parent of the API host (which sets
 * it) and the app/marketing hosts (which read it). It was previously scoped to publicBaseDomain —
 * the tenant-forms domain — which browsers reject on api.pplcrm.com responses, silently disabling
 * the marketing site's signed-in hint in production.
 */
describe('sharedParentDomain', () => {
  it('derives the parent domain of api. and app. hosts', () => {
    expect(sharedParentDomain('https://api.pplcrm.com', 'https://app.pplcrm.com')).toBe('.pplcrm.com');
  });

  it('is host-only (undefined) in local dev where both hosts are localhost', () => {
    expect(sharedParentDomain('http://localhost:3000', 'http://localhost:4200')).toBeUndefined();
  });

  it('never yields a bare TLD when the hosts share only their TLD', () => {
    expect(sharedParentDomain('https://api.example.com', 'https://app.other.com')).toBeUndefined();
  });

  it('handles multi-part public suffixes by requiring shared labels, not label count', () => {
    expect(sharedParentDomain('https://api.acme.co.uk', 'https://app.acme.co.uk')).toBe('.acme.co.uk');
  });

  it('works when the app lives at the shared apex itself', () => {
    expect(sharedParentDomain('https://api.pplcrm.com', 'https://pplcrm.com')).toBe('.pplcrm.com');
  });

  it('ignores ports when comparing hosts', () => {
    expect(sharedParentDomain('https://api.pplcrm.com:8443', 'https://app.pplcrm.com')).toBe('.pplcrm.com');
  });
});
