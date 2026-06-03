/**
 * tRPC router for application settings such as retrieving active campaigns.
 */
import { UpsertSettingsInputObj } from '@common';
import { z } from 'zod';

import { authProcedure, publicProcedure, router } from '../../../trpc';
import { SettingsController } from './controller';

const settings = new SettingsController();

/** Router exposing settings-related procedures. */
export const SettingsRouter = router({
  getCurrentCampaignId: authProcedure.query(({ ctx }) => settings.getCurrentCampaignId(ctx.auth)),
  getSnapshot: authProcedure.query(({ ctx }) => settings.getSnapshot(ctx.auth)),
  upsert: authProcedure
    .input(UpsertSettingsInputObj)
    .mutation(({ ctx, input }) => settings.upsert(ctx.auth, input.entries)),
  requestEmailVerification: authProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(({ ctx, input }) => settings.requestEmailVerification(ctx.auth, input.email)),
  verifySenderEmail: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(({ input }) => settings.verifySenderEmail(input.token)),
});
