import { z } from 'zod';

import { idSchema } from '../../../../../../libs/common/src';
import { adminOrOwnerProcedure as baseAdminOrOwnerProcedure, authProcedure, router } from '../../../trpc';
import { planFeatureGate } from '../billing/plan-gate';
import { CompanionAccessController } from './controller';

const controller = new CompanionAccessController();

// FEATURE_MATRIX plan gate: companion volunteers are Grassroots-and-up (Free includes none), so
// approving/revoking volunteer access is blocked on Free.
const adminOrOwnerProcedure = baseAdminOrOwnerProcedure.use(planFeatureGate('volunteers'));

/** Staff surface for the companion access layer: the Volunteer access page. */
export const CompanionAccessRouter = router({
  getAll: authProcedure.query(({ ctx }) => controller.getAllVolunteers(ctx.auth.tenant_id)),
  pendingCount: authProcedure.query(({ ctx }) => controller.pendingCount(ctx.auth.tenant_id)),
  approve: adminOrOwnerProcedure
    .input(z.object({ id: idSchema }))
    .mutation(({ ctx, input }) => controller.approveVolunteer(ctx.auth, input.id)),
  revoke: adminOrOwnerProcedure
    .input(z.object({ id: idSchema }))
    .mutation(({ ctx, input }) => controller.revokeVolunteer(ctx.auth, input.id)),
});
