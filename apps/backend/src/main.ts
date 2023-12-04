import cors from '@fastify/cors';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import closeWithGrace from 'close-with-grace';
import fastify from 'fastify';
import * as pino from 'pino';
import { routes } from './app/app.route';
import { routers } from './app/app.router';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
process.on('SIGTERM', closeWithGrace);
process.on('SIGINT', closeWithGrace);

const logger: pino.Logger = pino.pino({
  transport: {
    target: 'pino-pretty',
  },
});

function createServer() {
  const server = fastify({
    logger,
    ignoreTrailingSlash: true,
    exposeHeadRoutes: false,
  });

  server.register(cors, {
    origin: true,
  });
  server.register(fastifyTRPCPlugin, {
    trpcOptions: { router: routers },
  });
  server.register(routes);

  const stop = () => server.close();
  const start = async () => {
    try {
      await server.listen({ host, port });
      server.log.info('listening on port', port);
    } catch (err) {
      server.log.error(err);
      process.exit(1);
    }
  };
  return { server, start, stop };
}

const server = createServer();
server.start().then(() => console.log(`server starter on port ${port}`));

closeWithGrace({ delay: 2500 }, async function ({ err }) {
  if (err) logger.error(err);

  logger.info('Backend gracefully quit');
  // await migrateDown();
  await server.stop();
});
