import type { FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify';

import { DeliveriesController } from '../controller';
import { DELIVERY_SKIP_REASONS } from '../../../../../../../libs/common/src';

const controller = new DeliveriesController();

// Per-IP fixed-window rate limit — a volunteer taps fast, but a scraper shouldn't hammer tokens.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 120;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

// Uniform "not active" body — never distinguish expired vs revoked vs nonexistent (spec §6/§7).
const NOT_ACTIVE = { error: "This route link isn't active. Ask your organizer for a new one." };

function isValidAction(value: unknown): value is 'deliver' | 'skip' | 'defer' | 'undo' {
  return value === 'deliver' || value === 'skip' || value === 'defer' || value === 'undo';
}

function isValidReason(value: unknown): value is (typeof DELIVERY_SKIP_REASONS)[number] {
  return typeof value === 'string' && (DELIVERY_SKIP_REASONS as readonly string[]).includes(value);
}

const deliveriesPublicRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  // GET the volunteer-safe route payload (first name + address only).
  fastify.get('/r/:token', async (req: FastifyRequest, reply: FastifyReply) => {
    const { token } = req.params as { token: string };
    if (rateLimited(req.ip)) return reply.status(429).send({ error: 'Too many requests. Please slow down.' });
    try {
      const payload = await controller.getPublicRoute(String(token));
      if (!payload) return reply.status(404).send(NOT_ACTIVE);
      return reply.status(200).send(payload);
    } catch (err) {
      fastify.log.error(err, 'Failed to load public delivery route');
      return reply.status(404).send(NOT_ACTIVE);
    }
  });

  // POST a volunteer action against a single stop. Every write is attributed "via volunteer link".
  fastify.post('/r/:token/stops/:stopId', async (req: FastifyRequest, reply: FastifyReply) => {
    const { token, stopId } = req.params as { token: string; stopId: string };
    if (rateLimited(req.ip)) return reply.status(429).send({ error: 'Too many requests. Please slow down.' });
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (!isValidAction(body['action'])) return reply.status(400).send({ error: 'Unknown action.' });
    const reason = isValidReason(body['reason']) ? body['reason'] : null;
    try {
      const payload = await controller.publicStopAction(String(token), String(stopId), body['action'], reason);
      if (!payload) return reply.status(404).send(NOT_ACTIVE);
      return reply.status(200).send(payload);
    } catch (err) {
      fastify.log.error(err, 'Failed to apply public delivery stop action');
      return reply.status(404).send(NOT_ACTIVE);
    }
  });

  done();
};

export default deliveriesPublicRoute;
