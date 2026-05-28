import { getAllOptions, idSchema } from '@common';
import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { ActivityController } from './controller';
import { wrapTrpc } from '../../lib/trpc/wrap-trpc';

const activity = new ActivityController();

export const ActivityRouter = router({
  getFeed: authProcedure
    .input(getAllOptions)
    .query(wrapTrpc(({ input, ctx }) => activity.getFeed(ctx.auth, input))),
  getActivities: authProcedure
    .input(z.object({ entity: z.string(), entityId: idSchema }))
    .query(wrapTrpc(({ input, ctx }) => activity.getActivities(ctx.auth.tenant_id, input.entity, input.entityId))),
});
