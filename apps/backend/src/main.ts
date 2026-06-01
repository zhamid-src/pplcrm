import * as pino from 'pino';
import './env';

import { migrateToLatest } from './app/kyselyinit';
import { FastifyServer } from './fastify.server';
import { onShutdown } from './shutdown';
import { BackgroundJobWorker } from './app/lib/jobs/worker';

/**
 * Create the logger with pino-pretty
 */
const logger: pino.Logger = pino.pino({
  transport: {
    target: 'pino-pretty',
  },
});

const worker = new BackgroundJobWorker();

/**
 * Migrate the database and start the worker
 */
(async () => {
  await migrateToLatest();
  worker.start();
})();

/**
 * Create the server and serve
 */
const server = new FastifyServer(logger);

(async () => await server.serve())();

/**
 * Close the server gracefully
 */
onShutdown(async () => {
  console.log('Stopping background worker…');
  worker.stop();
  console.log('Closing DB…');
  await server.close();
});
