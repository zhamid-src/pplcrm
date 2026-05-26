import { idSchema, getAllOptions } from '@common';
import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { FilesController } from './controller';
import { wrapTrpc } from '../../lib/trpc/wrap-trpc';

const files = new FilesController();

export const FilesRouter = router({
  getAll: authProcedure
    .input(getAllOptions)
    .query(wrapTrpc(({ input, ctx }) => files.getAllFiles(ctx.auth, input))),
  
  delete: authProcedure
    .input(idSchema)
    .mutation(wrapTrpc(({ input, ctx }) => files.delete(ctx.auth.tenant_id, input, ctx.auth.user_id))),
  
  deleteMany: authProcedure
    .input(z.array(idSchema).min(1, 'At least one ID is required'))
    .mutation(wrapTrpc(({ input, ctx }) => files.deleteMany(ctx.auth.tenant_id, input, ctx.auth.user_id))),
});
