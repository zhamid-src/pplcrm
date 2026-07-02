import type { FastifyPluginCallback } from 'fastify';
import { StorageService } from '../../../lib/storage.service';
import { BaseRepository } from '../../../lib/base.repo';
import { verifyAuthToken } from '../../../lib/auth-util';

const storageService = new StorageService();

const filesRoute: FastifyPluginCallback = (fastify, _, done) => {
  fastify.get('/download/:id', async (req: any, reply) => {
    // Authenticate token via header or query string (for direct link downloading)
    let token = req.query.token;
    if (!token && req.headers.authorization) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized: Missing token' });
    }

    let payload: any = null;
    try {
      payload = await verifyAuthToken(token);
    } catch (_err) {
      return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
    }

    const tenantId = payload.tenant_id;
    const db = (BaseRepository as any)['_db'];
    const { id } = req.params;

    const file = await db
      .selectFrom('files')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id)
      .executeTakeFirst();

    if (!file) {
      return reply.status(404).send({ error: 'File not found' });
    }

    try {
      const buffer = await storageService.download(file.storage_key);
      reply.type(file.mime_type || 'application/octet-stream');
      reply.header('Content-Disposition', `attachment; filename="${file.filename}"`);
      reply.header('Cache-Control', 'public, max-age=31536000, immutable');
      return reply.send(buffer);
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to download file' });
    }
  });

  done();
};

export default filesRoute;
