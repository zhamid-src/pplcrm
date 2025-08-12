/**
 * Registers REST routes for email operations such as retrieving folders and messages.
 */
import { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { EmailsController } from '../../controllers/emails.controller';
import { IdParam } from '../fastify.types';

const emails = new EmailsController();

/**
 * Fastify plugin that defines email-related routes.
 *
 * @param fastify - The Fastify instance used to register routes.
 * @param _ - Unused options object.
 * @param done - Callback to signal completion of route registration.
 */
const routes: FastifyPluginCallback = (fastify, _, done) => {
  fastify.get('/folders', (req: FastifyRequest) => emails.getFolders(req.headers['tenant-id'] as string));
  fastify.get('/message/:id', (req: IdParam) =>
    emails.getEmailHeader(req.headers['tenant-id'] as string, req.params.id),
  );
  fastify.post('/message/:id/comment', (req: FastifyRequest<{ Body: { author_id: string; comment: string } }>) =>
    emails.addComment(req.headers['tenant-id'] as string, (req.params as any).id, req.body.author_id, req.body.comment),
  );
  fastify.post('/message/:id/assign', (req: FastifyRequest<{ Body: { user_id: string } }>) =>
    emails.assignEmail(req.headers['tenant-id'] as string, (req.params as any).id, req.body.user_id),
  );
  done();
};

export default routes;
