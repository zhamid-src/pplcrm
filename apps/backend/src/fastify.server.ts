import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';

import { default as fastify } from 'fastify';

import { routes } from './app/routes';
import { trpcRouters } from './app/trpc.routers';
import { createContext } from './context';

/**
 * Wrapper class for a Fastify server instance.
 *
 * Registers core plugins, routes, and tRPC integration.
 */
export class FastifyServer {
  private readonly _server;

  /**
   * Initializes the Fastify server with sensible defaults, logging,
   * CORS, and tRPC support.
   *
   * @param {object} [opts={}] - Optional configuration for CORS and plugin options.
   */
  constructor(opts: object = {}) {
    // Create Fastify instance with logging and common config
    this._server = fastify({
      logger: {
        level: 'info',
        transport: {
          target: 'pino-pretty', // Prettified logging output
        },
      },
      ignoreTrailingSlash: true,
      exposeHeadRoutes: false,
    });

    // Register REST routes
    this._server.register(routes);

    // Register core Fastify plugins
    this._server.register(cors, { ...opts });
    this._server.register(sensible);

    // Register tRPC plugin for RPC-based APIs
    this._server.register(fastifyTRPCPlugin, {
      prefix: '/',
      trpcOptions: {
        router: trpcRouters,
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
    return await this._server.close();
  }

  /**
   * Starts the Fastify server and listens on the configured host and port.
   *
   * Logs success or exits on error.
   *
   * @returns {Promise<void>}
   */
  public async serve(): Promise<void> {
    await this._server.listen({ port, host }, (err) => {
      if (err) {
        this._server.log.error(err);
        process.exit(1);
      } else {
        this._server.log.info(`[ ready ] http://${host}:${port}`);
      }
    });
  }
}

// Set default host and port if not defined in environment
const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
