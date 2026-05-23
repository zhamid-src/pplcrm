import { FastifyPluginCallback } from 'fastify';
import { StorageService } from '../../../lib/storage.service';
import { BaseRepository } from '../../../lib/base.repo';

const storageService = new StorageService();

const emailsApiRoute: FastifyPluginCallback = (fastify, _, done) => {
  // Download attachment by ID
  fastify.get('/:id/attachments/:attachmentId', async (req: any, reply) => {
    const { id, attachmentId } = req.params;
    const db = (BaseRepository as any)['_db'];

    const attachment = await db.selectFrom('email_attachments')
      .selectAll()
      .where('id', '=', attachmentId)
      .where('email_id', '=', id)
      .executeTakeFirst();

    if (!attachment || !attachment.file_id) {
      return reply.status(404).send({ error: 'Attachment not found' });
    }

    const file = await db.selectFrom('files')
      .selectAll()
      .where('id', '=', attachment.file_id)
      .executeTakeFirst();

    if (!file) {
      return reply.status(404).send({ error: 'File not found' });
    }

    try {
      const buffer = await storageService.download(file.storage_key);
      reply.type(file.mime_type || 'application/octet-stream');
      reply.header('Content-Disposition', `attachment; filename="${file.filename}"`);
      return reply.send(buffer);
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to download attachment' });
    }
  });

  // Serve inline attachment by CID
  fastify.get('/:id/attachments/cid/:cid', async (req: any, reply) => {
    const { id, cid } = req.params;
    const db = (BaseRepository as any)['_db'];

    const attachment = await db.selectFrom('email_attachments')
      .selectAll()
      .where('email_id', '=', id)
      .where('cid', '=', cid)
      .where('is_inline', '=', true)
      .executeTakeFirst();

    if (!attachment || !attachment.file_id) {
      return reply.status(404).send({ error: 'Inline attachment not found' });
    }

    const file = await db.selectFrom('files')
      .selectAll()
      .where('id', '=', attachment.file_id)
      .executeTakeFirst();

    if (!file) {
      return reply.status(404).send({ error: 'File not found' });
    }

    try {
      const buffer = await storageService.download(file.storage_key);
      reply.type(file.mime_type || 'application/octet-stream');
      reply.header('Cache-Control', 'public, max-age=31536000');
      return reply.send(buffer);
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to load inline image' });
    }
  });

  done();
};

export default emailsApiRoute;
