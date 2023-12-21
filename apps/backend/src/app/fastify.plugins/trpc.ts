import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { routers } from "../../app/app.router";
import { createContext } from "../../context";

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-sensible
 */
export default fp(async function (fastify: FastifyInstance) {
  fastify.register(fastifyTRPCPlugin, {
    prefix: "/",
    trpcOptions: { router: routers, createContext },
  });
});
