import * as pino from 'pino';
import './env';

import { migrateToLatest } from './app/kyselyinit';
import { FastifyServer } from './fastify.server';
import { onShutdown } from './shutdown';

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
onShutdown(async () => {
  console.log('Closing DB…');
  await server.close();
});
