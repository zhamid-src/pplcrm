import * as Sentry from '@sentry/node';

// Sentry must initialize before anything it instruments, so this module is the FIRST import in
// main.ts. It reads process.env raw (not ./env) — importing ./env here would run its
// throw-on-invalid Zod parse before Sentry can capture anything, and would drag app modules into
// the pre-instrumentation import graph.
//
// Errors-only to start (tracesSampleRate 0); no PII: error reports carry technical failure
// details, never workspace records — that is what the privacy policy promises (see
// apps/website/src/app/legal/privacy-content.ts, subprocessors), so the scrubbing in beforeSend
// is a product commitment, not a nicety.
Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  enabled: Boolean(process.env['SENTRY_DSN']),
  environment: process.env['NODE_ENV'] ?? 'development',
  tracesSampleRate: 0,
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.data;
      if (event.request.headers) {
        delete event.request.headers['cookie'];
        delete event.request.headers['authorization'];
        delete event.request.headers['x-companion-session'];
      }
    }
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }
    return event;
  },
});
