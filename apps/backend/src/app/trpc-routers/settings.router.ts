import { TRPCError } from '@trpc/server';

import { authProcedure, router } from '../../trpc';
import { SettingsController } from '../controllers/settings.controller';

/**
 * Get a current campaign for the current tenant.
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

/**
 * Settings endpoints
 */
export const SettingsRouter = router({
  getCurrentCampaignId: getCurrentCampaignId(),
});
