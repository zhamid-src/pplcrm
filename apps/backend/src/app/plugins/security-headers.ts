import type { FastifyHelmetOptions } from '@fastify/helmet';

/**
 * Security-header configuration for `@fastify/helmet` (SECURITY-REVIEW.md 2.2).
 *
 * Applies to every response. The only HTML this server emits is the bespoke
 * public form / event pages, which use inline `<style>` + `style=""` and load
 * Google Fonts — hence the style/font allowances. There are no `<script>` tags,
 * so `script-src` stays `'self'` (the `javascript:` back-links were removed).
 *
 * `frame-ancestors 'none'` is safe: the Forms "embed" iframes the SPA public page
 * on a different host, not these API-hosted pages, so clickjacking protection here
 * does not break embedding.
 *
 * CORP is `cross-origin` so the SPA (a different origin) can still load
 * tenant-scoped, token-gated resources this API serves (avatars, attachments).
 */
export const helmetOptions: FastifyHelmetOptions = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:'],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      // Not forced: it would try to upgrade http subresources/POSTs on local http dev.
      upgradeInsecureRequests: null,
    },
  },
  // Ignored by browsers over plain http (dev); enforces HTTPS in production. 180 days.
  hsts: { maxAge: 15552000, includeSubDomains: true },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // The API is not a document that needs cross-origin isolation; COEP would only
  // risk breaking resource loads.
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'no-referrer' },
};
