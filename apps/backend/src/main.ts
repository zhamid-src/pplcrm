import closeWithGrace from "close-with-grace";
import * as pino from "pino";
import { migrateDown } from "./app/kyselyiit";
import { FastifyServer } from "./fastify.server";

process.on("SIGTERM", closeWithGrace);
process.on("SIGINT", closeWithGrace);

const logger: pino.Logger = pino.pino({
  transport: {
    target: "pino-pretty",
  },
});
const server = new FastifyServer(logger);
(async () => {
  await server.serve();
})();

closeWithGrace({ delay: 2500 }, async function ({ err }) {
  console.log("Closing with grace!");
  await migrateDown();
  if (err) logger.error(err);
  await server.close();
});
