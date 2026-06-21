import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { DonationsController } from './controller';
import { BaseRepository } from '../../lib/base.repo';

const controller = new DonationsController();

export const DonationsRouter = router({
  listDonations: authProcedure.query(({ ctx }) => {
    return controller.getTenantDonationsList(ctx.auth.tenant_id);
  }),

  getPersonDonationHistory: authProcedure.input(z.string()).query(({ ctx, input }) => {
    return controller.getPersonDonationsList(ctx.auth.tenant_id, input);
  }),

  getDonationStats: authProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const tenantId = ctx.auth.tenant_id;
    const currentYear = new Date().getFullYear();
    const cumulativeCents = await controller.getPersonCumulativeDonations(tenantId, input, currentYear);

    const limitVal = await BaseRepository.dbInstance
      .selectFrom('settings')
      .select('value')
      .where('tenant_id', '=', tenantId as any)
      .where('key', '=', 'donations.limit')
      .executeTakeFirst();

    const limitSetting = limitVal?.value !== undefined && limitVal?.value !== null ? Number(limitVal.value) : 1000;

    return {
      cumulativeAmount: cumulativeCents / 100,
      limitAmount: limitSetting,
      remainingAmount: Math.max(0, limitSetting - cumulativeCents / 100),
    };
  }),

  checkEligibility: authProcedure
    .input(
      z.object({
        personId: z.string(),
        amountCents: z.number(),
        address: z.object({
          country: z.string().optional(),
          state: z.string().optional(),
        }),
      }),
    )
    .query(({ ctx, input }) => {
      return controller.checkEligibility(ctx.auth.tenant_id, input.personId, input.amountCents, input.address);
    }),

  createCheckout: authProcedure
    .input(
      z.object({
        personId: z.string(),
        amountCents: z.number(),
        address: z.object({
          country: z.string().optional(),
          state: z.string().optional(),
        }),
      }),
    )
    .mutation(({ ctx, input }) => {
      return controller.createCheckoutSession(ctx.auth, input.personId, input.amountCents, input.address);
    }),

  confirmDonation: authProcedure
    .input(
      z.object({
        sessionId: z.string(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return controller.confirmDonation(ctx.auth.tenant_id, ctx.auth.user_id, input.sessionId);
    }),

  confirmMockDonation: authProcedure
    .input(
      z.object({
        personId: z.string(),
        amountCents: z.number(),
        sessionId: z.string(),
        province: z.string(),
        country: z.string(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return controller.confirmMockDonation(
        ctx.auth.tenant_id,
        ctx.auth.user_id,
        input.personId,
        input.amountCents,
        input.sessionId,
        input.province,
        input.country,
      );
    }),
});
