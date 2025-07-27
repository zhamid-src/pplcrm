import * as pino from 'pino';

import closeWithGrace from 'close-with-grace';

import { migrateToLatest } from './app/kyselyinit';
import { FastifyServer } from './fastify.server';

process.on('SIGTERM', closeWithGrace);

process.on('SIGINT', closeWithGrace);

/**
 * Create the logger with pino-pretty
 */
const logger: pino.Logger = pino.pino({
  transport: {
    target: 'pino-pretty',
  },
});

/**
 * Migrate the database
 */
(async () => await migrateToLatest())();

/**
 * Create the server and serve
 */
const server = new FastifyServer(logger);

(async () => await server.serve())();

/**
 * Close the server gracefully
 */
closeWithGrace({ delay: 2500 }, async function ({ err }) {
  if (err) logger.error(err);
  await server.close();
});
