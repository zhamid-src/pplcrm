import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { DashboardController } from './controller';

const dashboard = new DashboardController();

export const DashboardRouter = router({
  getStats: authProcedure
    .query(({ ctx }) => dashboard.getStats(ctx.auth)),

  getBreachedEmails: authProcedure
    .input(z.object({ page: z.number().int().min(1), limit: z.number().int().min(1) }))
    .query(({ input, ctx }) => dashboard.getBreachedEmails(ctx.auth, input)),

  getBreachedTasks: authProcedure
    .input(z.object({ page: z.number().int().min(1), limit: z.number().int().min(1) }))
    .query(({ input, ctx }) => dashboard.getBreachedTasks(ctx.auth, input)),
});
