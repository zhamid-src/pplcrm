import { AddWebFormObj, UpdateWebFormObj, getAllOptions } from '../../../../../../libs/common/src';
import { z } from 'zod';

import { authProcedure, publicProcedure, router } from '../../../trpc';
import { WebFormsController } from './controller';

const webForms = new WebFormsController();

export const WebFormsRouter = router({
  getAllWithCounts: authProcedure
    .input(getAllOptions)
    .query(({ input, ctx }) => webForms.getAllWithCounts(ctx.auth.tenant_id, input)),
  getById: authProcedure
    .input(z.string().uuid())
    .query(({ input, ctx }) => webForms.getOneById({ tenant_id: ctx.auth.tenant_id, id: input })),
  add: authProcedure.input(AddWebFormObj).mutation(({ input, ctx }) => webForms.addForm(input, ctx.auth)),
  update: authProcedure
    .input(z.object({ id: z.string().uuid(), data: UpdateWebFormObj }))
    .mutation(({ input, ctx }) => webForms.updateForm(input.id, input.data, ctx.auth)),
  delete: authProcedure
    .input(z.string().uuid())
    .mutation(({ input, ctx }) => webForms.delete(ctx.auth.tenant_id, input, ctx.auth.user_id)),
  getSubmissionsCount: authProcedure
    .input(z.string().uuid())
    .query(({ input, ctx }) => webForms.getSubmissionsCount(input, ctx.auth.tenant_id)),
  confirmSubscription: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(({ input }) => webForms.confirmSubscription(input.token)),
});
