import closeWithGrace from 'close-with-grace';
import * as pino from 'pino';
import { FastifyServer } from './fastify.server';

process.on('SIGTERM', closeWithGrace);
process.on('SIGINT', closeWithGrace);

const logger: pino.Logger = pino.pino({
  transport: {
    target: 'pino-pretty',
  },
});
const server = new FastifyServer(logger);
(async () => {
  await server.serve();
})();

closeWithGrace({ delay: 2500 }, async function ({ signal, err, manual }) {
  if (err) logger.error(err);
  // await migrateDown();
  await server.close();
});
