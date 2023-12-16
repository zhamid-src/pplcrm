import { default as fastify } from "fastify";
import * as pino from "pino";
// import { errorHandler } from "./utils/error";
import AutoLoad from "@fastify/autoload";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import * as path from "path";
import { routes } from "./app/app.route";
import { routers } from "./app/app.router";
import { createContext } from "./context";

const host = process.env.HOST ?? "localhost";
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

export class FastifyServer {
  private readonly server;

  constructor(logger: pino.Logger, opts: object = {}) {
    this.server = fastify({
      logger,
      ignoreTrailingSlash: true,
      exposeHeadRoutes: false,
    });

    //this.server.setErrorHandler(errorHandler);
    this.server.register(routes);
    this.server.register(cors, {
      origin: true,
    });

    this.server.register(fastifyTRPCPlugin, {
      prefix: "/",
      trpcOptions: { router: routers, createContext },
    });

    // This loads all plugins defined in the plugins folder
    this.server.register(AutoLoad, {
      dir: path.join(__dirname, "app/kysely.plugins"),
      options: { ...opts },
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
