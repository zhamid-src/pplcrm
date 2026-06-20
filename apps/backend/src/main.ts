import * as pino from 'pino';
import './env';

import { migrateToLatest } from './app/kyselyinit';
import { FastifyServer } from './fastify.server';
import { onShutdown } from './shutdown';
import { BackgroundJobWorker } from './app/lib/jobs/worker';
import { WebhookEventWorker } from './app/lib/jobs/webhook-worker';

const logger: pino.Logger = pino.pino({
  transport: {
    target: 'pino-pretty',
  },
});

const worker = new BackgroundJobWorker();
const webhookWorker = new WebhookEventWorker();

(async () => {
  await migrateToLatest();
  worker.start();
  webhookWorker.start();
})();

const server = new FastifyServer(logger);

(async () => await server.serve())();

onShutdown(async () => {
  console.log('Stopping background workers…');
  await worker.stop();
  await webhookWorker.stop();
  console.log('Closing DB…');
  await server.close();
});
