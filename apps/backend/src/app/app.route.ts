import { FastifyInstance } from "fastify";

/* eslint-disable @typescript-eslint/no-var-requires */
const personsRoute = require("./fastify.routes/persons.route");
const householdsRoute = require("./fastify.routes/households.route");
const authRoute = require("./fastify.routes/auth.route");

export function routes(
  fastify: FastifyInstance,
  _opts: never,
  done: () => void,
) {
  fastify.register(personsRoute, { prefix: "/v1/persons" });
  fastify.register(householdsRoute, { prefix: "/v1/households" });
  fastify.register(authRoute, { prefix: "/auth/" });

  fastify.get("/", (req, res) => res.send({ message: "API healthy." }));
  done();
}
