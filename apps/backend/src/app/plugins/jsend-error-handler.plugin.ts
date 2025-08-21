import { jsend } from '@common'; // your shared jsend helpers
import { TRPCError } from '@trpc/server';

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import { AppError } from '../errors/app-errors';
import { toTRPCError } from '../errors/to-trpc-errors';

async function jsendErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err: any, _req: FastifyRequest, reply: FastifyReply) => {
    // Domain errors -> JSend
    if (err instanceof AppError) {
      if (err.status >= 500) {
        return reply.code(err.status).send(jsend.error(err.message, err.code));
      }
      return reply.code(err.status).send(jsend.fail({ code: err.code, message: err.message, details: err.data }));
    }

    // tRPC errors (if thrown in REST by accident)
    if (err instanceof (toTRPCError as any)) {
      const status = statusFromTRPC(err.code);
      if (status >= 500) {
        return reply.code(status).send(jsend.error(err.message, err.code));
      }
      return reply.code(status).send(jsend.fail({ code: err.code, message: err.message }));
    }

    // Unknown -> generic internal
    app.log.error({ err }, 'Unhandled error');
    return reply.code(500).send(jsend.error('Internal Server Error'));
  });
}

function statusFromTRPC(code: TRPCError['code']): number {
  switch (code) {
    case 'BAD_REQUEST':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
      return 409;
    case 'PRECONDITION_FAILED':
      return 412;
    case 'PAYLOAD_TOO_LARGE':
      return 413;
    case 'TOO_MANY_REQUESTS':
      return 429;
    default:
      return 500;
  }
}

declare module 'fastify' {
  interface FastifyReply {
    jsendSuccess<T>(data: T, meta?: Record<string, unknown>): FastifyReply;
    jsendFail<E extends object = Record<string, unknown>>(
      data: E,
      statusCode?: number,
      meta?: Record<string, unknown>,
    ): FastifyReply;
    jsendError(
      message: string,
      statusCode?: number,
      code?: string | number,
      data?: unknown,
      meta?: Record<string, unknown>,
    ): FastifyReply;
  }
}

export default fp(jsendErrorHandler);
