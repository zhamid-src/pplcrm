import { AddMarketingEmailObj, UpdateMarketingEmailObj, idSchema } from '@common';

import { authProcedure, router } from '../../../trpc';
import { NewslettersController } from './controller';
import { createCrudRouter } from '../../lib/crud-router';

const newsletters = new NewslettersController();

const crud = createCrudRouter(newsletters, AddMarketingEmailObj, UpdateMarketingEmailObj);

export const NewslettersRouter = router({
  ...crud,

  getEngagementStats: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => newsletters.getEngagementStats(ctx.auth.tenant_id, input)),

  send: authProcedure
    .input(idSchema)
    .mutation(async ({ input, ctx }) => {
      return newsletters.sendNewsletter(ctx.auth.tenant_id, input, ctx.auth.user_id);
    }),
});
