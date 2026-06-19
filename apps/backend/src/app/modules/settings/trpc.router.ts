/**
 * tRPC router for application settings such as retrieving active campaigns.
 */
import { UpsertSettingsInputObj } from '../../../../../../libs/common/src';
import { z } from 'zod';

import { authProcedure, adminOrOwnerProcedure, publicProcedure, router } from '../../../trpc';
import { SettingsController } from './controller';

const settings = new SettingsController();

/** Router exposing settings-related procedures. */
export const SettingsRouter = router({
  getCurrentCampaignId: authProcedure.query(({ ctx }) => settings.getCurrentCampaignId(ctx.auth)),
  getSnapshot: authProcedure.query(({ ctx }) => settings.getSnapshot(ctx.auth)),
  upsert: adminOrOwnerProcedure
    .input(UpsertSettingsInputObj)
    .mutation(({ ctx, input }) => settings.upsert(ctx.auth, input.entries)),
  requestEmailVerification: adminOrOwnerProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(({ ctx, input }) => settings.requestEmailVerification(ctx.auth, input.email)),
  verifySenderEmail: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(({ input }) => settings.verifySenderEmail(input.token)),
  scheduleTenantDeletion: adminOrOwnerProcedure.mutation(({ ctx }) => settings.scheduleTenantDeletion(ctx.auth)),
  cancelTenantDeletion: adminOrOwnerProcedure.mutation(({ ctx }) => settings.cancelTenantDeletion(ctx.auth)),
  addVerifiedDomain: adminOrOwnerProcedure
    .input(z.object({ domain: z.string().min(1) }))
    .mutation(({ ctx, input }) => settings.addVerifiedDomain(ctx.auth, input.domain)),
  verifyVerifiedDomain: adminOrOwnerProcedure
    .input(z.object({ domain: z.string().min(1) }))
    .mutation(({ ctx, input }) => settings.verifyVerifiedDomain(ctx.auth, input.domain)),
  deleteVerifiedDomain: adminOrOwnerProcedure
    .input(z.object({ domain: z.string().min(1) }))
    .mutation(({ ctx, input }) => settings.deleteVerifiedDomain(ctx.auth, input.domain)),
});
