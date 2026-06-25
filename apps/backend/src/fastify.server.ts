import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';

import fastify from 'fastify';

import jsendPlugin from './app/plugins/jsend-error-handler.plugin';
import { routes } from './app/routes';
import { trpcRouter } from './app/modules/trpc';
import { createContext } from './context';
import { env } from './env';

export class FastifyServer {
  private readonly server;

  constructor(opts: object = {}) {
    // Create Fastify instance with logging and common config
    this.server = fastify({
      logger: {
        level: 'info',
        transport: {
          target: 'pino-pretty', // Prettified logging output
        },
      },
      routerOptions: {
        ignoreTrailingSlash: true,
      },
      exposeHeadRoutes: false,
    });

    // Globally serialize BigInt properties as strings in responses
    this.server.setReplySerializer((payload) => {
      return JSON.stringify(payload, (_, value) => (typeof value === 'bigint' ? value.toString() : value));
    });

    // Register core Fastify plugins
    this.server.register(cors, { ...opts });
    this.server.register(sensible);
    this.server.register(multipart, {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    });
    this.server.register(jsendPlugin);

    // Register a content type parser for application/json that keeps raw body if path is webhook
    this.server.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
      if (
        req.url.includes('/billing/webhook') ||
        req.url.includes('/donations/webhook') ||
        req.url.includes('/newsletters/webhook')
      ) {
        done(null, body);
      } else {
        try {
          done(null, JSON.parse(body as string));
        } catch (err) {
          done(err as Error, null);
        }
      }
    });

    // Register REST routes
    this.server.register(routes);

    // Register tRPC plugin for RPC-based APIs
    this.server.register(fastifyTRPCPlugin, {
      prefix: '/',
      trpcOptions: {
        router: trpcRouter,
        createContext,
      },
    });
  }

  public async close(): Promise<void> {
    return await this.server.close();
  }

  public async serve(): Promise<void> {
    try {
      const address = await this.server.listen({ port: env.port, host: env.host });
      this.server.log.info(`[ ready ] ${address}`);
    } catch (err) {
      this.server.log.error(err);
      process.exit(1);
    }
  }
}
