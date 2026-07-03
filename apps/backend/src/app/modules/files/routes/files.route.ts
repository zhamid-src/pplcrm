import type { FastifyPluginCallback } from 'fastify';
import { StorageService } from '../../../lib/storage.service';
import { BaseRepository } from '../../../lib/base.repo';
import { verifyAuthToken } from '../../../lib/auth-util';
import { verifyFileDownloadToken } from '../../../lib/signed-download';
import { attachmentDisposition } from '../../../lib/download-headers';

const storageService = new StorageService();

const filesRoute: FastifyPluginCallback = (fastify, _, done) => {
  fastify.get('/download/:id', async (req: any, reply) => {
    const { id } = req.params;

    // Authenticate via the Authorization header (app-initiated downloads) or
    // a short-lived token scoped to this one file (avatar <img> URLs).
    // Session JWTs in the query string are deliberately not accepted — URLs
    // leak into browser history, proxies, and logs.
    let tenantId: string | null = null;
    try {
      if (req.query.st) {
        tenantId = verifyFileDownloadToken(req.query.st, String(id)).tenant_id;
      } else if (req.headers.authorization) {
        const payload = await verifyAuthToken(req.headers.authorization.split(' ')[1]);
        tenantId = payload.tenant_id;
      }
    } catch (_err) {
      return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
    }

    if (!tenantId) {
      return reply.status(401).send({ error: 'Unauthorized: Missing token' });
    }

    const db = (BaseRepository as any)['_db'];

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
      reply.header('Content-Disposition', attachmentDisposition(file.filename));
      // Private: these files are tenant-scoped and token-gated — never allow shared caches.
      reply.header('Cache-Control', 'private, max-age=31536000, immutable');
      return reply.send(buffer);
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to download file' });
    }
  });

  done();
};

export default filesRoute;
