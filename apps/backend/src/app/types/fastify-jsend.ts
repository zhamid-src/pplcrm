// apps/backend/src/types/fastify-jsend.d.ts
import 'fastify';

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
