---
name: pplcrm-debugging
description: "Trace a failed request through PeopleCRM's backend error plumbing (AppError → tRPC → Pino) to the client toast, and catch this stack's specific silent-failure traps. USE WHEN debugging a production/runtime failure, a useless 'Something went wrong' toast, a stuck spinner, a swallowed error, or when someone gives you a correlationId / support code. EXAMPLES: 'why did this fail in production but the toast is generic', 'trace this tRPC error in the client back to the server', 'user gave me a support code, find the log', 'the spinner never stops on this page', 'a save silently did nothing'."
---

# Debugging PeopleCRM

## The one thing that will waste your time if you don't know it

**tRPC errors carry NO correlationId to the client.** CLAUDE.md §3 describes a
`correlationId`+Pino sanitization pattern as if it's universal — it is **not** wired into the tRPC
path. The only correlationId that ever reaches a human is the background-sync **"support code"**
generated in `apps/backend/src/app/lib/jobs/worker.ts:568` / `:586`
(`Math.random().toString(36).slice(2, 10).toUpperCase()`), surfaced via
`oauthSvc.recordSyncError(... 'Sync failed — support code: ${correlationId}')` (`worker.ts:579`, `:596`).

So there are two completely different failure paths, debugged differently:

1. **A user hands you a "support code" (e.g. `A1B2C3D4`)** → it's a Microsoft/Google sync job that
   died. Grep the logs for that literal code (see below).
2. **A tRPC toast** ("Not found", "Something went wrong, please try again", a validation message) →
   there is no id. You correlate by **timestamp + the underlying stack trace** in the server log,
   not by an id.

## The tRPC round trip (cite these when tracing)

A procedure throws → the client shows a toast. Every hop:

1. **Throw** — a procedure/repo throws an `AppError` subclass (`apps/backend/src/app/errors/app-errors.ts`:
   `NotFoundError`, `BadRequestError`, `ForbiddenError`, `ConflictError`, `InternalError`, …), a raw
   `Error`, or a `TRPCError`.
2. **Map** — `errorMappingMiddleware` wraps every `publicProcedure` and calls `toTRPCError(err)`
   (`apps/backend/src/trpc.ts:69-77`). `toTRPCError` (`apps/backend/src/app/errors/to-trpc-errors.ts:5`)
   maps `AppError.status` → a tRPC code (400→`BAD_REQUEST`, 404→`NOT_FOUND`, etc.).
3. **The production-vs-dev message split** — `to-trpc-errors.ts:8`
   `const isDevOrTest = process.env['NODE_ENV'] !== 'production';`. In dev/test the underlying cause is
   appended to the message: `` `${err.message} (Cause: ${err.cause.message})` `` (`:34-38`, `:49-53`).
   **In production that append is skipped** — the client gets only the safe default message
   (e.g. `NotFoundError`'s `'Not found'`, `InternalError`'s `'Something went wrong, please try again'`).
   This is _the_ reason a prod toast is useless while the same bug is obvious locally. The real cause
   lives only in the server log.
4. **Log + format** — `errorFormatter` (`apps/backend/src/trpc.ts:14-64`) runs on every tRPC error:
   `logger.error({ err: error }, 'tRPC Error')` (`:15`) and, if there's a cause,
   `logger.error({ err: error.cause }, 'tRPC Error Cause')` (`:17`). **The `'tRPC Error Cause'` line is
   the gold** — its serialized stack points at the file:line that actually threw. Note it does _not_ log
   the tRPC `path`, so you can't grep by procedure name here; match on the stack/message.
   (`errorFormatter` also collapses all sign-in failures to a generic message — `trpc.ts:53-55` — so a
   bad-password toast is deliberately vague; that's not a bug.)
5. **Client receives** — `TRPCClientError` in the frontend link (`apps/frontend/src/app/services/api/trpc-service.ts:100`)
   wraps it into `ApiError(msg, err)` (`:115`), then `errorSvc.handle(finalErr)` (`:121`).
6. **Toast** — `ErrorService.handle` (`apps/frontend/src/app/services/error.service.ts:18`) calls
   `this.alerts.showError(error.message)`. For this round trip (an `ApiError` wrapping a
   `TRPCClientError`) the toast fires at `:41`; sibling branches at `:31`/`:45` handle bare
   `TRPCClientError`s and non-tRPC originals. `UNAUTHORIZED` short-circuits into a redirect
   to `/signin` instead of a toast (`error.service.ts:64-70`). So the toast text == the server's
   `shape.message` from step 3/4.

REST routes (webhooks, file up/downloads) do **not** use this path — they hit the Fastify
`setErrorHandler` in `apps/backend/src/app/plugins/jsend-error-handler.plugin.ts:41`, which logs
unknown errors as `app.log.error({ err }, 'Unhandled error')` (`:60`) and returns a JSend envelope.

## Grepping Pino output

Both loggers use the `pino-pretty` transport (`apps/backend/src/app/logger.ts:3-7` for the standalone
`logger` that tRPC/workers use; `apps/backend/src/fastify.server.ts:20-24` for the Fastify request
logger), so log lines are **human-pretty, not JSON** in local/dev runs. Grep by the literal message
label or the code string:

```bash
# A tRPC failure and its root cause (run against your captured server output / log file):
grep -A20 "tRPC Error Cause"      # the stack that actually threw — start here
grep "tRPC Error"                 # the mapped/sanitized error the client saw

# A user's background-sync "support code" (worker.ts:568/586 logs correlationId + userId):
grep -i "A1B2C3D4"                # matches the correlationId field in the log line
                                  # (the 'support code' sentence itself goes to the DB token record, not the log)
grep "sync permanently failed"    # all MS/Google sync deaths (worker.ts:569/587)

# REST/webhook path:
grep "Unhandled error"            # jsend-error-handler.plugin.ts:60
```

There is no request-id on the `'tRPC Error'` lines (they go through the standalone `logger`, not
Fastify's per-request logger), so correlate a tRPC failure by **timestamp + stack**, not by reqId.

## Silent-failure traps specific to this codebase

1. **Aborted requests are toasted-swallowed by design.** `trpc-service.ts:120`
   `if (!meta?.skipErrorHandler && !isAbortError(err))` — an aborted in-flight request produces **no
   toast and no error surfaced**. `TRPCService.abort()` (`trpc-service.ts:47`) fires on component
   teardown and superseded loads. If a load "silently does nothing," confirm it wasn't aborted before
   hunting for a thrown error. Callers can also opt out entirely via `context.skipErrorHandler`.

2. **A discarded loading-gate disposer = permanently stuck gate.** `createLoadingGate().begin()`
   (`libs/uxcommon/src/loading-gate.ts:54`) returns a disposer; the gate's `pendingCount` only
   decrements when you call it. The correct pattern is try/finally, e.g.
   `person-view.ts:422-441` (`const end = this._loading.begin(); try { … } finally { end(); }`). If you
   call `begin()` and **throw away the return value**, `visible` flips true after the 300ms delay and
   never resets. Real example of the discard shape:
   `apps/frontend/src/app/experiences/emails/ui/email-details/email-details.ts:49`
   `this.noEmailMsgDelay.begin();`
   — there it's deliberate (a fallback message that should stay shown), but the identical code in a
   load path is a stuck-spinner bug. When a spinner never stops, grep the component for a `begin()`
   whose disposer isn't `end()`-ed in a `finally`.

3. **A floating promise on a fire-and-forget tRPC call swallows the failure.** ESLint's
   `no-floating-promises` forces every promise to be handled, and the common quick fix is a bare
   `.catch(() => console.error(...))` — which means the error is logged to the browser console but
   **never toasted**. Real example (same file as above): `email-details.ts:46`
   `this.store.loadEmailWithHeaders(e.id).catch((err) => console.error('Failed to load email header:', err))`.
   If data silently fails to appear with no toast, check the browser console for a swallowed
   `.catch` before assuming the request never fired.

## Non-goals

- **TRPCError codes / how to throw them / transaction & outbox conventions** → `pplcrm-trpc-backend`.
  This skill is about _reading_ a failure after the fact, not authoring the endpoint.
- **Generic Node/Angular/browser debugging** (breakpoints, `--inspect`, DevTools) — out of scope; every
  tip here is about this repo's specific wiring.
- **Reproducing/driving a change to confirm a fix** → use the `/verify` and `/run` slash-command skills.
