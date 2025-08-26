/**
 * Registers REST routes for person operations.
 */
import { FastifyPluginCallback } from 'fastify';

import { PersonsController } from '../controller';
import * as schema from './persons.schema';
import { createBasicRoutes } from '../../../lib/route.factory';

const persons = new PersonsController();

const routes: FastifyPluginCallback = createBasicRoutes(persons, schema);

export default routes;
