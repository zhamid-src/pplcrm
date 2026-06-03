import { z } from 'zod';
import { adminOrOwnerProcedure, router } from '../../../trpc';
import { BillingController } from './controller';

const controller = new BillingController();

export const BillingRouter = router({
  getDetails: adminOrOwnerProcedure.query(({ ctx }) => {
    return controller.getBillingDetails(ctx.auth);
  }),

  createCheckout: adminOrOwnerProcedure
    .input(z.object({ plan: z.enum(['grassroots', 'representative']) }))
    .mutation(({ ctx, input }) => {
      return controller.createCheckoutSession(ctx.auth, input.plan);
    }),

  createPortal: adminOrOwnerProcedure.mutation(({ ctx }) => {
    return controller.createPortalSession(ctx.auth);
  }),

  // Local mock testing mutation endpoints
  activateMockPlan: adminOrOwnerProcedure
    .input(z.object({ plan: z.enum(['grassroots', 'representative']) }))
    .mutation(({ ctx, input }) => {
      return controller.activateMockPlan(ctx.auth, input.plan);
    }),

  cancelMockPlan: adminOrOwnerProcedure.mutation(({ ctx }) => {
    return controller.cancelMockPlan(ctx.auth);
  }),
});
