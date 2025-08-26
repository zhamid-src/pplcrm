/**
 * Registers REST routes for household operations.
 */
import { FastifyPluginCallback } from 'fastify';

import { HouseholdsController } from '../controller';
import * as schema from './households.schema';
import { createBasicRoutes } from '../../../lib/route.factory';

const households = new HouseholdsController();

const routes: FastifyPluginCallback = createBasicRoutes(households, schema);

export default routes;
