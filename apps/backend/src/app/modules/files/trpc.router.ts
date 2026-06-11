import { idSchema, getAllOptions } from '@common';
import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { FilesController } from './controller';
import crypto from 'crypto';

const files = new FilesController();

export const FilesRouter = router({
  getAll: authProcedure.input(getAllOptions).query(({ input, ctx }) => files.getAllFiles(ctx.auth, input)),

  getUploadUrl: authProcedure
    .input(
      z.object({
        filename: z.string(),
        mimeType: z.string().nullable().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const fileUUID = crypto.randomUUID();
      const storageKey = `uploads/${ctx.auth.tenant_id}/${fileUUID}_${input.filename}`;
      const uploadUrl = await files.generateUploadSasUrl(storageKey);
      return { uploadUrl, storageKey };
    }),

  registerFile: authProcedure
    .input(
      z.object({
        filename: z.string(),
        mimeType: z.string().nullable().optional(),
        sizeBytes: z.number().nullable().optional(),
        storageKey: z.string(),
        sha256Hex: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return files.registerFile(input, ctx.auth);
    }),

  delete: authProcedure
    .input(idSchema)
    .mutation(({ input, ctx }) => files.delete(ctx.auth.tenant_id, input, ctx.auth.user_id)),

  deleteMany: authProcedure
    .input(z.array(idSchema).min(1, 'At least one ID is required'))
    .mutation(({ input, ctx }) => files.deleteMany(ctx.auth.tenant_id, input, ctx.auth.user_id)),
});
