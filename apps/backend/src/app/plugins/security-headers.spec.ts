import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import helmet from '@fastify/helmet';

import { helmetOptions } from './security-headers';

/**
 * Boots a bare Fastify with the shared helmet config (SECURITY-REVIEW.md 2.2) and
 * inspects the headers on a response, without standing up the full app.
 */
async function headersFor(path = '/'): Promise<Record<string, string>> {
  const app = Fastify();
  await app.register(helmet, helmetOptions);
  app.get('/', async () => ({ ok: true }));
  const res = await app.inject({ method: 'GET', url: path });
  await app.close();
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(res.headers)) out[k] = String(v);
  return out;
}

describe('security headers', () => {
  it('sets a Content-Security-Policy tuned for the server-rendered pages', async () => {
    const h = await headersFor();
    const csp = h['content-security-policy'];
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    // Google Fonts + inline styles must be permitted for the form/event pages.
    expect(csp).toContain('https://fonts.googleapis.com');
    expect(csp).toContain('https://fonts.gstatic.com');
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    // Must NOT force insecure-request upgrades (would break local http dev).
    expect(csp).not.toContain('upgrade-insecure-requests');
  });

  it('sets nosniff, HSTS, referrer-policy and a cross-origin resource policy', async () => {
    const h = await headersFor();
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['strict-transport-security']).toContain('max-age=15552000');
    expect(h['referrer-policy']).toBe('no-referrer');
    expect(h['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('forbids framing (clickjacking protection)', async () => {
    const h = await headersFor();
    // helmet sets both the CSP directive and the legacy header.
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(h['x-frame-options']).toBe('SAMEORIGIN');
  });
});
