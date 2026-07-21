import * as pino from 'pino';

// pino-pretty is a dev-only formatter and is expensive/blocking under load, so use it only outside
// production; production emits plain JSON logs for log shippers (same rule as fastify.server.ts).
const isProduction = process.env['NODE_ENV'] === 'production';

export const logger = pino.pino({
  level: 'info',
  ...(isProduction ? {} : { transport: { target: 'pino-pretty' } }),
});
