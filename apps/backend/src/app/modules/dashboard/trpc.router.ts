import { authProcedure, router } from '../../../trpc';
import { DashboardController } from './controller';

const dashboard = new DashboardController();

export const DashboardRouter = router({
  getStats: authProcedure
    .query(({ ctx }) => dashboard.getStats(ctx.auth)),
});
