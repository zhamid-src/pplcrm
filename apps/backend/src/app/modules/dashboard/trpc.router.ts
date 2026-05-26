import { authProcedure, router } from '../../../trpc';
import { DashboardController } from './controller';
import { wrapTrpc } from '../../lib/trpc/wrap-trpc';

const dashboard = new DashboardController();

export const DashboardRouter = router({
  getStats: authProcedure
    .query(wrapTrpc(({ ctx }) => dashboard.getStats(ctx.auth))),
});
