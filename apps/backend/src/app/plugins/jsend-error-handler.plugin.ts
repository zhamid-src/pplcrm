import { jsend } from '@common';
import { TRPCError } from '@trpc/server';

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import { AppError } from '../errors/app-errors';

async function jsendPlugin(app: FastifyInstance) {
  // Reply helpers
  app.decorateReply('jsendSuccess', function (data: unknown, meta?: Record<string, unknown>) {
    const body = jsend.success(data);
    return this.code(200).send(meta ? { ...body, meta } : body);
  });

  app.decorateReply(
    'jsendFail',
    function <E extends object = Record<string, unknown>>(
      data: E,
      statusCode = 400,
      meta?: Record<string, unknown>,
    ) {
      const body = jsend.fail(data);
      return this.code(statusCode).send(meta ? { ...body, meta } : body);
    },
  );

  app.decorateReply(
    'jsendError',
    function (
      message: string,
      statusCode = 500,
      code?: string | number,
      data?: unknown,
      meta?: Record<string, unknown>,
    ) {
      const body: any = jsend.error(message, code);
      if (data !== undefined) body.data = data;
      if (meta) body.meta = meta;
      return this.code(statusCode).send(body);
    },
  );

  app.setErrorHandler((err: any, _req: FastifyRequest, reply: FastifyReply) => {
    // Domain errors -> JSend
    if (err instanceof AppError) {
      if (err.status >= 500) {
        return reply.code(err.status).send(jsend.error(err.message, err.code));
      }
      return reply
        .code(err.status)
        .send(jsend.fail({ code: err.code, message: err.message, details: err.data }));
    }

    // tRPC errors (if thrown in REST by accident)
    if (err instanceof TRPCError) {
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

export default fp(jsendPlugin);
