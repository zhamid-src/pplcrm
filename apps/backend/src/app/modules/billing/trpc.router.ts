import { z } from 'zod';
import { PURCHASABLE_PLAN_KEYS } from '@common';
import { adminOrOwnerProcedure, router } from '../../../trpc';
import { BillingController } from './controller';

const controller = new BillingController();

export const BillingRouter = router({
  getDetails: adminOrOwnerProcedure.query(({ ctx }) => controller.getBillingDetails(ctx.auth)),

  createCheckout: adminOrOwnerProcedure
    .input(z.object({ plan: z.enum(PURCHASABLE_PLAN_KEYS) }))
    .mutation(({ ctx, input }) => controller.createCheckoutSession(ctx.auth, input.plan)),

  createPortal: adminOrOwnerProcedure.mutation(({ ctx }) => controller.createPortalSession(ctx.auth)),

  // Local mock testing mutation endpoints
  activateMockPlan: adminOrOwnerProcedure
    .input(z.object({ plan: z.enum(PURCHASABLE_PLAN_KEYS) }))
    .mutation(({ ctx, input }) => controller.activateMockPlan(ctx.auth, input.plan)),

  cancelMockPlan: adminOrOwnerProcedure.mutation(({ ctx }) => controller.cancelMockPlan(ctx.auth)),
});
