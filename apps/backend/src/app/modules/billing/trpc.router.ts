import { z } from 'zod';
import { PURCHASABLE_PLAN_KEYS } from '@common';
import { adminOrOwnerProcedure, router } from '../../../trpc';
import { BillingController } from './controller';

const controller = new BillingController();

export const BillingRouter = router({
  getDetails: adminOrOwnerProcedure.query(({ ctx }) => controller.getBillingDetails(ctx.auth)),

  /** Live usage snapshot for the billing page: emailable subscribers vs. the tenant's currently
   * billed bracket (subscriber/email caps, monthly price, tier max). See §5 of the pricing
   * overhaul plan. */
  getUsage: adminOrOwnerProcedure.query(({ ctx }) => controller.getUsage(ctx.auth)),

  createCheckout: adminOrOwnerProcedure
    .input(z.object({ plan: z.enum(PURCHASABLE_PLAN_KEYS) }))
    .mutation(({ ctx, input }) => controller.createCheckoutSession(ctx.auth, input.plan)),

  createPortal: adminOrOwnerProcedure.mutation(({ ctx }) => controller.createPortalSession(ctx.auth)),

  // Local mock testing mutation endpoints
  activateMockPlan: adminOrOwnerProcedure
    .input(z.object({ plan: z.enum(PURCHASABLE_PLAN_KEYS), quantity: z.number().int().min(1).max(40).optional() }))
    .mutation(({ ctx, input }) => controller.activateMockPlan(ctx.auth, input.plan, input.quantity)),

  cancelMockPlan: adminOrOwnerProcedure.mutation(({ ctx }) => controller.cancelMockPlan(ctx.auth)),
});
