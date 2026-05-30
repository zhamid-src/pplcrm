import { AddMarketingEmailObj, UpdateMarketingEmailObj, exportCsvInput, exportCsvResponse, getAllOptions, idSchema } from '@common';
import { z } from 'zod';

import { authProcedure, router } from '../../../trpc';
import { NewslettersController } from './controller';

const newsletters = new NewslettersController();

export const NewslettersRouter = router({
  getAllWithCounts: authProcedure
    .input(getAllOptions)
    .query(({ input, ctx }) => newsletters.getAllWithCounts(ctx.auth.tenant_id, input)),
  count: authProcedure.query(({ ctx }) => newsletters.getCount(ctx.auth.tenant_id)),
  getById: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => newsletters.getOneById({ tenant_id: ctx.auth.tenant_id, id: input })),
  getEngagementStats: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => newsletters.getEngagementStats(ctx.auth.tenant_id, input)),
  create: authProcedure
    .input(AddMarketingEmailObj)
    .mutation(async ({ input, ctx }) => {
      return newsletters.add({
        ...input,
        tenant_id: ctx.auth.tenant_id,
        createdby_id: ctx.auth.user_id,
        updatedby_id: ctx.auth.user_id,
      } as any);
    }),
  update: authProcedure
    .input(z.object({ id: idSchema, data: UpdateMarketingEmailObj }))
    .mutation(async ({ input, ctx }) => {
      return newsletters.update({
        tenant_id: ctx.auth.tenant_id,
        id: input.id,
        row: {
          ...input.data,
          updatedby_id: ctx.auth.user_id,
          updated_at: new Date(),
        } as any,
      });
    }),
  delete: authProcedure
    .input(idSchema)
    .mutation(async ({ input, ctx }) => {
      return newsletters.delete(ctx.auth.tenant_id, input, ctx.auth.user_id);
    }),
  send: authProcedure
    .input(idSchema)
    .mutation(async ({ input, ctx }) => {
      return newsletters.sendNewsletter(ctx.auth.tenant_id, input, ctx.auth.user_id);
    }),
  exportCsv: authProcedure
    .input(exportCsvInput)
    .output(exportCsvResponse)
    .mutation(({ input, ctx }) => newsletters.exportCsv({ tenant_id: ctx.auth.tenant_id, ...(input ?? {}) }, ctx.auth)),
});
