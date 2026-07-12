import { z } from 'zod';
import { idSchema } from './core.schema';

/**
 * Offline gift entry (spec §12, Fig. 15 "Record donation" dialog). Distinct from the Stripe
 * checkout path (`createCheckout`/`confirmDonation`) — this is for gifts collected outside the
 * public donation form (cash at a fundraiser, a mailed check, a bank transfer).
 */
export const DONATION_METHODS = ['card', 'check', 'cash', 'bank_transfer'] as const;
export const DONATION_METHOD_LABELS: Record<(typeof DONATION_METHODS)[number], string> = {
  card: 'Card',
  check: 'Check',
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
};

export const donationMethodSchema = z.enum(DONATION_METHODS);
export type DonationMethod = z.infer<typeof donationMethodSchema>;

export const RecordDonationObj = z.object({
  personId: idSchema,
  amountCents: z.number().int().positive('Enter an amount above zero, like 50'),
  method: donationMethodSchema,
  /** Campaigns §15 — which fund this gift belongs to; backend defaults to the office. */
  campaign_id: idSchema.optional(),
});
export type RecordDonationType = z.infer<typeof RecordDonationObj>;
