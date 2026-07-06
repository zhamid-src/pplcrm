import { z } from 'zod';
import { authProcedure, router } from '../../../trpc';
import { DonationsController } from './controller';

const controller = new DonationsController();

export const DonationsRouter = router({
  // ── One-time donations ──────────────────────────────────────────────────────

  listDonations: authProcedure.query(({ ctx }) => controller.getTenantDonationsList(ctx.auth.tenant_id)),

  getPersonDonationHistory: authProcedure
    .input(z.string())
    .query(({ ctx, input }) => controller.getPersonDonationsList(ctx.auth.tenant_id, input)),

  getDonationStats: authProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => controller.getDonationStats(ctx.auth.tenant_id, input)),

  checkEligibility: authProcedure
    .input(
      z.object({
        personId: z.string(),
        amountCents: z.number(),
        address: z.object({
          country: z.string().optional(),
          state: z.string().optional(),
        }),
        isRecurring: z.boolean().optional(),
        remainingMonths: z.number().optional(),
      }),
    )
    .query(({ ctx, input }) =>
      controller.checkEligibility(ctx.auth.tenant_id, input.personId, input.amountCents, input.address, {
        isRecurring: input.isRecurring,
        remainingMonths: input.remainingMonths,
      }),
    ),

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
    .mutation(({ ctx, input }) =>
      controller.createCheckoutSession(ctx.auth, input.personId, input.amountCents, input.address),
    ),

  confirmDonation: authProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(({ ctx, input }) => controller.confirmDonation(ctx.auth.tenant_id, ctx.auth.user_id, input.sessionId)),

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
    .mutation(({ ctx, input }) =>
      controller.confirmMockDonation(
        ctx.auth.tenant_id,
        ctx.auth.user_id,
        input.personId,
        input.amountCents,
        input.sessionId,
        input.province,
        input.country,
      ),
    ),

  // ── Recurring pledges ───────────────────────────────────────────────────────

  createRecurringCheckout: authProcedure
    .input(
      z.object({
        personId: z.string(),
        monthlyAmountCents: z.number(),
        address: z.object({
          country: z.string().optional(),
          state: z.string().optional(),
        }),
      }),
    )
    .mutation(({ ctx, input }) =>
      controller.createRecurringCheckoutSession(ctx.auth, input.personId, input.monthlyAmountCents, input.address),
    ),

  confirmMockPledge: authProcedure
    .input(
      z.object({
        personId: z.string(),
        monthlyAmountCents: z.number(),
        mockSubId: z.string(),
        province: z.string(),
        country: z.string(),
      }),
    )
    .mutation(({ ctx, input }) =>
      controller.confirmMockPledge(
        ctx.auth.tenant_id,
        ctx.auth.user_id,
        input.personId,
        input.monthlyAmountCents,
        input.mockSubId,
        input.province,
        input.country,
      ),
    ),

  listPledges: authProcedure.query(({ ctx }) => controller.getTenantPledgesList(ctx.auth.tenant_id)),

  getPersonPledges: authProcedure
    .input(z.string())
    .query(({ ctx, input }) => controller.getPersonPledges(ctx.auth.tenant_id, input)),

  cancelPledge: authProcedure
    .input(z.object({ pledgeId: z.string() }))
    .mutation(({ ctx, input }) => controller.cancelPledge(ctx.auth.tenant_id, input.pledgeId, ctx.auth.user_id)),

  // ── Donation periods ────────────────────────────────────────────────────────

  getDonationPeriods: authProcedure.query(({ ctx }) => controller.getDonationPeriods(ctx.auth.tenant_id)),

  createDonationPeriod: authProcedure
    .input(
      z.object({
        name: z.string().min(1),
        start_date: z.string(),
        end_date: z.string().nullable().optional(),
        limit_amount: z.number().int().positive(),
      }),
    )
    .mutation(({ ctx, input }) => controller.createDonationPeriod(ctx.auth.tenant_id, ctx.auth.user_id, input)),

  updateDonationPeriod: authProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        start_date: z.string().optional(),
        end_date: z.string().nullable().optional(),
        limit_amount: z.number().int().positive().optional(),
        is_active: z.boolean().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...payload } = input;
      return controller.updateDonationPeriod(ctx.auth.tenant_id, ctx.auth.user_id, id, payload);
    }),

  deleteDonationPeriod: authProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => controller.deleteDonationPeriod(ctx.auth.tenant_id, input.id)),

  // ── Webhook token (stored hashed, shown once — SECURITY-REVIEW 2.4) ──────────

  getWebhookTokenStatus: authProcedure.query(({ ctx }) => controller.getWebhookTokenStatus(ctx.auth.tenant_id)),

  regenerateWebhookToken: authProcedure.mutation(({ ctx }) =>
    controller.regenerateWebhookToken(ctx.auth.tenant_id, ctx.auth.user_id),
  ),
});
