import { getAllOptions, idSchema, exportCsvInput, exportCsvResponse } from '@common';
import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { ActivityController } from './controller';

const activity = new ActivityController();

export const ActivityRouter = router({
  getFeed: authProcedure
    .input(getAllOptions)
    .query(({ input, ctx }) => activity.getFeed(ctx.auth, input)),
  getActivities: authProcedure
    .input(z.object({ entity: z.string(), entityId: idSchema }))
    .query(({ input, ctx }) => activity.getActivities(ctx.auth.tenant_id, input.entity, input.entityId)),
  exportCsv: authProcedure
    .input(exportCsvInput)
    .output(exportCsvResponse)
    .mutation(({ input, ctx }) => activity.exportCsv({ tenant_id: ctx.auth.tenant_id, ...(input ?? {}) }, ctx.auth)),
});
