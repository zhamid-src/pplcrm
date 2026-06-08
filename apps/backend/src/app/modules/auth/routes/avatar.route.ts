/**
 * REST routes for managing a user's profile avatar.
 * POST /api/auth/avatar  — Upload (replace) profile picture
 * DELETE /api/auth/avatar — Remove profile picture
 */
import { FastifyPluginCallback } from 'fastify';
import { randomUUID } from 'crypto';
import { StorageService } from '../../../lib/storage.service';
import { UserProfiles } from '../../userprofiles/repositories/userprofiles.repo';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const storageService = new StorageService();
const profilesRepo = new UserProfiles();

const avatarRoute: FastifyPluginCallback = (fastify, _, done) => {
  /**
   * POST /api/auth/avatar
   * Accepts a multipart/form-data with a single "avatar" file field.
   * Uploads to Azure, inserts a row in `files`, sets profile.avatar_file_id.
   */
  fastify.post('', async (req: any, reply) => {
    const auth = req.auth;
    if (!auth?.user_id || !auth?.tenant_id) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    let file: any;
    try {
      file = await req.file();
    } catch {
      return reply.status(400).send({ error: 'Expected multipart/form-data with an "avatar" field' });
    }

    if (!file) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const mimeType: string = file.mimetype ?? '';
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return reply
        .status(415)
        .send({ error: `Unsupported image type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` });
    }

    // Collect the stream into a buffer
    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (buffer.length > MAX_SIZE_BYTES) {
      return reply.status(413).send({ error: 'File too large. Maximum size is 5 MB.' });
    }

    const fileId = randomUUID();
    const ext = mimeType.split('/')[1] || 'jpg';
    const storageKey = `avatars/${auth.tenant_id}/${auth.user_id}/${fileId}.${ext}`;

    // Upload to blob storage
    await storageService.upload(storageKey, buffer, mimeType);

    const db = profilesRepo.db;

    // Delete old avatar file record (if any) to keep storage clean
    const existingProfile: any = await profilesRepo.getOneByAuthId(auth.user_id);
    if (existingProfile?.avatar_file_id) {
      try {
        const oldFile = await db
          .selectFrom('files')
          .select(['storage_key'])
          .where('id', '=', existingProfile.avatar_file_id)
          .where('tenant_id', '=', auth.tenant_id)
          .executeTakeFirst();
        if (oldFile?.storage_key) {
          await storageService.delete(oldFile.storage_key);
        }
        await db.deleteFrom('files').where('id', '=', existingProfile.avatar_file_id).execute();
      } catch (err) {
        fastify.log.error({ err }, 'Failed to clean up old avatar file');
      }
    }

    // Insert new file record
    const now = new Date();
    const inserted = await db
      .insertInto('files')
      .values({
        id: fileId,
        tenant_id: auth.tenant_id,
        filename: file.filename || `avatar.${ext}`,
        mime_type: mimeType,
        size_bytes: buffer.length,
        storage_key: storageKey,
        uploaded_by: auth.user_id,
      })
      .returning(['id'])
      .executeTakeFirst();

    if (!inserted?.id) {
      return reply.status(500).send({ error: 'Failed to record avatar file' });
    }

    // Update profile.avatar_file_id
    if (existingProfile) {
      await db
        .updateTable('profiles')
        .set({ avatar_file_id: inserted.id, updated_at: now, updatedby_id: auth.user_id })
        .where('auth_id', '=', auth.user_id)
        .execute();
    } else {
      await db
        .insertInto('profiles')
        .values({
          tenant_id: auth.tenant_id,
          auth_id: auth.user_id,
          avatar_file_id: inserted.id,
          createdby_id: auth.user_id,
          updatedby_id: auth.user_id,
        })
        .execute();
    }

    const port = process.env['PORT'] || process.env['API_PORT'] || '3000';
    const host = process.env['API_HOST'] || 'localhost';
    const baseUrl = `http://${host}:${port}`;
    const avatar_url = `${baseUrl}/api/files/download/${inserted.id}`;

    return reply.send({ success: true, avatar_url, file_id: inserted.id });
  });

  /**
   * DELETE /api/auth/avatar
   * Removes the current user's avatar.
   */
  fastify.delete('', async (req: any, reply) => {
    const auth = req.auth;
    if (!auth?.user_id || !auth?.tenant_id) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const db = profilesRepo.db;
    const existingProfile: any = await profilesRepo.getOneByAuthId(auth.user_id);

    if (!existingProfile?.avatar_file_id) {
      return reply.send({ success: true });
    }

    const fileId = existingProfile.avatar_file_id;

    try {
      const oldFile = await db
        .selectFrom('files')
        .select(['storage_key'])
        .where('id', '=', fileId)
        .where('tenant_id', '=', auth.tenant_id)
        .executeTakeFirst();
      if (oldFile?.storage_key) {
        await storageService.delete(oldFile.storage_key);
      }
      await db.deleteFrom('files').where('id', '=', fileId).execute();
    } catch (err) {
      fastify.log.error({ err }, 'Failed to delete avatar blob/file record');
    }

    await db
      .updateTable('profiles')
      .set({ avatar_file_id: null, updated_at: new Date(), updatedby_id: auth.user_id })
      .where('auth_id', '=', auth.user_id)
      .execute();

    return reply.send({ success: true });
  });

  done();
};

export default avatarRoute;
