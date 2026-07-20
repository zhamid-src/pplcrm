import type { FastifyPluginCallback } from 'fastify';
import { TRPCError } from '@trpc/server';

import { EventsController } from '../controller';
import { validateApiKeyFromRequest } from '../../../lib/validate-api-key';
import { resolveTenantFromRequest } from '../../../lib/public-tenant';

const ctrl = new EventsController();

// Per-key sliding-window rate limiting
const keySubmissionTimestamps = new Map<string, number[]>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function isRateLimited(tenantId: string): boolean {
  const now = Date.now();
  let timestamps = keySubmissionTimestamps.get(tenantId) || [];
  timestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) return true;
  timestamps.push(now);
  if (timestamps.length > 0) {
    keySubmissionTimestamps.set(tenantId, timestamps);
  } else {
    keySubmissionTimestamps.delete(tenantId);
  }
  return false;
}

function getStatusFromError(err: unknown): number {
  if (err instanceof TRPCError) {
    switch (err.code) {
      case 'BAD_REQUEST':
        return 400;
      case 'NOT_FOUND':
        return 404;
      case 'CONFLICT':
        return 409;
      case 'TOO_MANY_REQUESTS':
        return 429;
      default:
        return 500;
    }
  }
  const statusCode = (err as { statusCode?: unknown })?.statusCode;
  return typeof statusCode === 'number' ? statusCode : 500;
}

/**
 * JSON API behind the public /e/:slug SPA page (registered outside the app shell, like /f/:slug).
 * The tenant is identified by its subdomain — the `?t=` param the SPA passes, or the Host header —
 * and every event lookup is tenant-scoped. The server-rendered HTML pages this file used to carry
 * are gone; the SPA owns presentation.
 */
const eventsPublicRoute: FastifyPluginCallback = (fastify, _, done) => {
  // Event config for the SPA page: event details + tickets + live capacity.
  fastify.get<{ Params: { slug: string } }>('/e/:slug', async (req, reply) => {
    const { slug } = req.params;
    try {
      const tenant = await resolveTenantFromRequest(req);
      if (!tenant) {
        return reply.status(404).send({ error: 'Event not found.' });
      }
      const result = await ctrl.getPublicEventConfig(tenant.id, String(slug));
      return reply.status(200).send(result);
    } catch (err) {
      const status = getStatusFromError(err);
      // Never leak internal detail on a public endpoint; NOT_FOUND is the only expected miss.
      if (status >= 500) fastify.log.error(err, 'Failed to load public event');
      return reply.status(status === 404 ? 404 : status).send({ error: 'Event not found.' });
    }
  });

  // RSVP submission from the SPA page (JSON body).
  fastify.post<{ Params: { slug: string }; Body: Record<string, string> }>('/rsvp/:slug', async (req, reply) => {
    const { slug } = req.params;

    try {
      // Validate API key and get tenant
      const tenantId = await validateApiKeyFromRequest(req);

      // Check rate limit per tenant
      if (isRateLimited(tenantId)) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded. Please try again in a minute.',
        });
      }

      await ctrl.rsvpPublic(tenantId, String(slug), req.body || {});
      return reply.status(200).send({ success: true });
    } catch (err) {
      fastify.log.error(err);
      const status = getStatusFromError(err);
      // Client errors carry user-actionable copy; 5xx detail must not leak to the public.
      const message =
        status < 500 && err instanceof Error && err.message ? err.message : 'An unexpected error occurred.';
      return reply.status(status).send({ error: message });
    }
  });

  done();
};

export default eventsPublicRoute;
