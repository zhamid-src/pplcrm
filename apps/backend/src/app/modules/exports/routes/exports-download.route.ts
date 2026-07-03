import type { FastifyPluginCallback } from 'fastify';
import { StorageService } from '../../../lib/storage.service';
import { ExportsRepo } from '../repositories/exports.repo';
import { verifyAuthToken } from '../../../lib/auth-util';
import { attachmentDisposition } from '../../../lib/download-headers';

const storageService = new StorageService();
const exportsRepo = new ExportsRepo();

const exportsDownloadRoute: FastifyPluginCallback = (fastify, _, done) => {
  fastify.get('/download/:id', async (req: any, reply) => {
    // Authorization header only — session JWTs in the query string are
    // deliberately not accepted because URLs leak into history and logs.
    const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;
    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized: Missing token' });
    }

    let auth: any = null;
    try {
      auth = await verifyAuthToken(token);
    } catch {
      return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
    }

    const { id } = req.params as { id: string };
    const exportRecord = await exportsRepo.getById(id, auth.tenant_id);

    if (!exportRecord) {
      return reply.status(404).send({ error: 'Export not found' });
    }
    if ((exportRecord as any).status !== 'completed') {
      return reply.status(409).send({ error: 'Export is not ready yet' });
    }
    if (!(exportRecord as any).storage_key) {
      return reply.status(404).send({ error: 'Export file not available' });
    }

    try {
      const buffer = await storageService.download((exportRecord as any).storage_key);
      reply.type('text/csv; charset=utf-8');
      reply.header('Content-Disposition', attachmentDisposition((exportRecord as any).file_name));
      return reply.send(buffer);
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to stream export file' });
    }
  });

  done();
};

export default exportsDownloadRoute;
