import { getAllOptions } from '@common';
import { authProcedure, router } from '../../../trpc';
import { ActivityController } from './controller';
import { wrapTrpc } from '../../lib/trpc/wrap-trpc';

const activity = new ActivityController();

export const ActivityRouter = router({
  getFeed: authProcedure
    .input(getAllOptions)
    .query(wrapTrpc(({ input, ctx }) => activity.getFeed(ctx.auth, input))),
});
