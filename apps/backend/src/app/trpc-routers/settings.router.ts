/**
 * tRPC router for application settings such as retrieving active campaigns.
 */
import { TRPCError } from '@trpc/server';

import { authProcedure, router } from '../../trpc';
import { SettingsController } from '../controllers/settings.controller';

/**
 * Retrieve the current campaign identifier for the tenant.
 * @throws TRPCError if the value is not found or invalid.
 */
function getCurrentCampaignId() {
  return authProcedure.query(async ({ ctx }) => {
    const value = await settings.getCurrentCampaignId(ctx.auth);

    if (value !== 'number') {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Current campaign setting not found or invalid.',
      });
    }

    return value;
  });
}

const settings = new SettingsController();

/** Router exposing settings-related procedures. */
export const SettingsRouter = router({
  getCurrentCampaignId: getCurrentCampaignId(),
});
