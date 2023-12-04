import AutoLoad from '@fastify/autoload';
import { FastifyInstance } from 'fastify';
import * as path from 'path';

/* eslint-disable-next-line */
export interface AppOptions {}

export async function app(fastify: FastifyInstance, opts: AppOptions) {
  // Place here your custom code!

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'kysely.plugins'),
    options: { ...opts },
  });
}
