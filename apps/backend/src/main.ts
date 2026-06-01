import * as pino from 'pino';
import './env';

import { migrateToLatest } from './app/kyselyinit';
import { FastifyServer } from './fastify.server';
import { onShutdown } from './shutdown';
import { BackgroundJobWorker } from './app/lib/jobs/worker';
import { WebhookEventWorker } from './app/lib/jobs/webhook-worker';

/**
 * Create the logger with pino-pretty
 */
const logger: pino.Logger = pino.pino({
  transport: {
    target: 'pino-pretty',
  },
});

const worker = new BackgroundJobWorker();
const webhookWorker = new WebhookEventWorker();

/**
 * Migrate the database and start the workers
 */
(async () => {
  await migrateToLatest();
  worker.start();
  webhookWorker.start();
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
  console.log('Stopping background workers…');
  worker.stop();
  webhookWorker.stop();
  console.log('Closing DB…');
  await server.close();
});
