import { env } from './env';

import { migrateToLatest } from './app/kyselyinit';
import { WebhookEventWorker } from './app/lib/jobs/webhook-worker';
import { BackgroundJobWorker } from './app/lib/jobs/worker';
import { logger } from './app/logger';
import { FastifyServer } from './fastify.server';
import { onShutdown } from './shutdown';

const worker = new BackgroundJobWorker();
const webhookWorker = new WebhookEventWorker();

void (async () => {
  // S-2: in production, migrations are a separate deploy step run as the owner
  // role (MIGRATE_ON_BOOT=false) — the serve process connects as the
  // least-privilege app role and must not attempt DDL. In dev this defaults on.
  if (env.migrateOnBoot) {
    await migrateToLatest();
  }
  worker.start();
  webhookWorker.start();
})();

const server = new FastifyServer();

void (async () => await server.serve())();

onShutdown(async () => {
  logger.info('Stopping background workers…');
  await worker.stop();
  await webhookWorker.stop();
  logger.info('Closing DB…');
  await server.close();
});
