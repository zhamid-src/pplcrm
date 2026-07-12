import { z } from 'zod';

import { idSchema } from '../../../../../../libs/common/src';
import { adminOrOwnerProcedure, authProcedure, router } from '../../../trpc';
import { CompanionAccessController } from './controller';

const controller = new CompanionAccessController();

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
