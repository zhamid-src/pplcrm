import { FastifyPluginCallback, FastifyRequest } from 'fastify';
import { EmailsController } from '../../controllers/emails.controller';
import { IdParam } from '../fastify.types';

const emails = new EmailsController();

/** REST routes for email operations */
const routes: FastifyPluginCallback = (fastify, _, done) => {
  fastify.get('/folders', (req: FastifyRequest) => emails.getFolders(req.headers['tenant-id'] as string));
  fastify.get('/folder/:folderId', (req: FastifyRequest) =>
    emails.getEmails(req.headers['tenant-id'] as string, (req.params as any).folderId),
  );
  fastify.get('/message/:id', (req: IdParam) => emails.getEmail(req.headers['tenant-id'] as string, req.params.id));
  fastify.post('/message/:id/comment', (req: FastifyRequest<{ Body: { author_id: string; comment: string } }> ) =>
    emails.addComment(
      req.headers['tenant-id'] as string,
      (req.params as any).id,
      req.body.author_id,
      req.body.comment,
    ),
  );
  fastify.post('/message/:id/assign', (req: FastifyRequest<{ Body: { user_id: string } }> ) =>
    emails.assignEmail(req.headers['tenant-id'] as string, (req.params as any).id, req.body.user_id),
  );
  done();
};

export default routes;
