import { exportCsvInput, exportCsvResponse, getAllOptions } from '@common';

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
    .input(z.string())
    .query(({ input, ctx }) => newsletters.getOneById({ tenant_id: ctx.auth.tenant_id, id: input })),
  exportCsv: authProcedure
    .input(exportCsvInput)
    .output(exportCsvResponse)
    .mutation(({ input, ctx }) => newsletters.exportCsv({ tenant_id: ctx.auth.tenant_id, ...(input ?? {}) }, ctx.auth)),
});
