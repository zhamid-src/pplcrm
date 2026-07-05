import { AddMarketingEmailObj, UpdateMarketingEmailObj, idSchema } from '../../../../../../libs/common/src';
import { z } from 'zod';

import { authProcedure, router } from '../../../trpc';
import { NewslettersController } from './controller';
import { createCrudRouter } from '../../lib/crud-router';

const newsletters = new NewslettersController();

const crud = createCrudRouter(newsletters, AddMarketingEmailObj, UpdateMarketingEmailObj);

const sendTestSchema = z.object({
  subject: z.string(),
  html: z.string(),
  text: z.string().optional(),
  to: z.email(),
  fromName: z.string().optional(),
  fromEmail: z.string().optional(),
});

export const NewslettersRouter = router({
  ...crud,

  getEngagementStats: authProcedure
    .input(idSchema)
    .query(({ input, ctx }) => newsletters.getEngagementStats(ctx.auth.tenant_id, input)),

  send: authProcedure
    .input(idSchema)
    .mutation(async ({ input, ctx }) => newsletters.sendNewsletter(ctx.auth.tenant_id, input, ctx.auth.user_id)),

  sendTest: authProcedure
    .input(sendTestSchema)
    .mutation(async ({ input, ctx }) => newsletters.sendTestEmail(ctx.auth.tenant_id, input)),
});
