import { default as fastify } from "fastify";
import * as pino from "pino";
// import { errorHandler } from "./utils/error";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";

import * as path from "path";
import { routes } from "./app/routes";
import { fileURLToPath } from "url";
import { trpcRouters } from "./app/trpc.routers";
import { createContext } from "./context";

const host = process.env.HOST ?? "localhost";
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

/**
 * Fastify server
 */
export class FastifyServer {
  private readonly server;

  constructor(logger: pino.Logger, opts: object = {}) {
    this.server = fastify({
      logger: {
        level: "info",
        transport: {
          target: "pino-pretty",
        },
      },
      ignoreTrailingSlash: true,
      exposeHeadRoutes: false,
    });

    this.server.register(routes);

    // This loads all plugins defined in the plugins folder
    this.server.register(cors, { ...opts });
    this.server.register(sensible);
    this.server.register(fastifyTRPCPlugin, {
      prefix: "/",
      trpcOptions: { router: trpcRouters, createContext },
    });
  }

  public async close() {
    return await this.server.close();
  }

  public async serve() {
    await this.server.listen({ port, host }, (err) => {
      if (err) {
        this.server.log.error(err);
        process.exit(1);
      } else {
        this.server.log.info(`[ ready ] http://${host}:${port}`);
      }
    });
  }
}
