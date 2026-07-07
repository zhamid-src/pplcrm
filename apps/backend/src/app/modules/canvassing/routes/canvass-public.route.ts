import type { FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify';

import { LogKnockObj } from '../../../../../../../libs/common/src';
import { CanvassingController } from '../controller';

/**
 * Public Canvass Companion API (§13.4) — the volunteer-facing surface.
 *
 * Access is by TOKEN, not by account: the token issued when a turf is assigned
 * (or a link is copied) is the bearer credential and resolves the tenant, so a
 * walk-up volunteer needs no login. This mirrors the tokenised-access model of
 * the public web-form/donation pages, but with a proper high-entropy token per
 * turf rather than a subdomain+slug. Every read/write is scoped to the resolved
 * tenant + turf inside the controller.
 */

const controller = new CanvassingController();

/** Narrow an unknown thrown value to an HTTP status without leaking internals. */
function statusOf(err: unknown): number {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const code = (err as { statusCode?: unknown }).statusCode;
    if (typeof code === 'number') return code;
  }
  return 500;
}

function messageOf(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

const canvassPublicRoute: FastifyPluginCallback = (fastify, _opts, done) => {
  // Door list for a tokenised turf.
  fastify.get('/turf', async (req: FastifyRequest, reply: FastifyReply) => {
    const token =
      typeof (req.query as { token?: unknown })?.token === 'string' ? (req.query as { token: string }).token : '';
    if (!token) {
      return reply.status(400).send({ error: 'Missing canvassing token.' });
    }
    try {
      const turf = await controller.getCompanionTurf(token);
      return reply.status(200).send(turf);
    } catch (err: unknown) {
      fastify.log.error(err);
      return reply.status(statusOf(err)).send({ error: messageOf(err, 'Unable to load this turf.') });
    }
  });

  // Log a knock. Idempotent on client_knock_id so offline re-sends are safe.
  fastify.post('/knock', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = LogKnockObj.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid knock payload.' });
    }
    try {
      const result = await controller.logKnock(parsed.data);
      return reply.status(200).send(result);
    } catch (err: unknown) {
      fastify.log.error(err);
      return reply.status(statusOf(err)).send({ error: messageOf(err, 'Unable to record this knock.') });
    }
  });

  done();
};

export default canvassPublicRoute;
