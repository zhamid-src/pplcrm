import {
  AddMarketingEmailObj,
  RunPreflightObj,
  UpdateMarketingEmailObj,
  idSchema,
} from '../../../../../../libs/common/src';
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

  getReport: authProcedure.input(idSchema).query(({ input, ctx }) => newsletters.getReport(ctx.auth.tenant_id, input)),

  createClickersList: authProcedure
    .input(idSchema)
    .mutation(({ input, ctx }) => newsletters.createClickersList(ctx.auth, input)),

  send: authProcedure
    .input(idSchema)
    .mutation(async ({ input, ctx }) => newsletters.sendNewsletter(ctx.auth.tenant_id, input, ctx.auth.user_id)),

  sendTest: authProcedure
    .input(sendTestSchema)
    .mutation(async ({ input, ctx }) => newsletters.sendTestEmail(ctx.auth.tenant_id, input)),

  runPreflight: authProcedure
    .input(RunPreflightObj)
    .mutation(async ({ input, ctx }) => newsletters.runPreflight(ctx.auth.tenant_id, input)),
});
