import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { BillingController } from './controller';

const controller = new BillingController();

export const BillingRouter = router({
  getDetails: authProcedure.query(({ ctx }) => {
    return controller.getBillingDetails(ctx.auth);
  }),

  createCheckout: authProcedure
    .input(z.object({ plan: z.enum(['grassroots', 'representative']) }))
    .mutation(({ ctx, input }) => {
      return controller.createCheckoutSession(ctx.auth, input.plan);
    }),

  createPortal: authProcedure.mutation(({ ctx }) => {
    return controller.createPortalSession(ctx.auth);
  }),

  // Local mock testing mutation endpoints
  activateMockPlan: authProcedure
    .input(z.object({ plan: z.enum(['grassroots', 'representative']) }))
    .mutation(({ ctx, input }) => {
      return controller.activateMockPlan(ctx.auth, input.plan);
    }),

  cancelMockPlan: authProcedure.mutation(({ ctx }) => {
    return controller.cancelMockPlan(ctx.auth);
  }),
});
