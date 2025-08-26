import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';

import fastify from 'fastify';

import jsendPlugin from './app/plugins/jsend-error-handler.plugin';
import { routes } from './app/routes';
import { trpcRouter } from './app/modules/trpc';
import { createContext } from './context';
import { env } from './env';

/**
 * Wrapper class for a Fastify server instance.
 *
 * Registers core plugins, routes, and tRPC integration.
 */
export class FastifyServer {
  private readonly server;

  /**
   * Initializes the Fastify server with sensible defaults, logging,
   * CORS, and tRPC support.
   *
   * @param {object} [opts={}] - Optional configuration for CORS and plugin options.
   */
  constructor(opts: object = {}) {
    // Create Fastify instance with logging and common config
    this.server = fastify({
      logger: {
        level: 'info',
        transport: {
          target: 'pino-pretty', // Prettified logging output
        },
      },
      ignoreTrailingSlash: true,
      exposeHeadRoutes: false,
    });

    // Register core Fastify plugins
    this.server.register(cors, { ...opts });
    this.server.register(sensible);
    this.server.register(jsendPlugin);

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

  /**
   * Gracefully shuts down the server.
   *
   * @returns {Promise<void>} Resolves when shutdown completes.
   */
  public async close(): Promise<void> {
    return await this.server.close();
  }

  /**
   * Starts the Fastify server and listens on the configured host and port.
   *
   * Logs success or exits on error.
   *
   * @returns {Promise<void>}
   */
  public async serve(): Promise<void> {
    await this.server.listen({ port: env.port, host: env.host }, (err) => {
      if (err) {
        this.server.log.error(err);
        process.exit(1);
      } else {
        this.server.log.info(`[ ready ] http://${env.host}:${env.port}`);
      }
    });
  }
}
