// Processor-agnostic one-time donation checkout. Stripe drives a hosted redirect; Helcim drives a
// client-side HelcimPay.js modal from a checkout token — hence the discriminated result so callers
// can launch either without knowing which processor a tenant chose.
export type CheckoutInit = { kind: 'redirect'; url: string | null } | { kind: 'helcim_pay'; checkoutToken: string };

export interface OneTimeCheckoutParams {
  tenantId: string;
  userId: string;
  personId: string;
  amountCents: number;
  address: { country?: string; state?: string };
  customUrls?: { successUrl?: string; cancelUrl?: string };
}

/**
 * A pluggable one-time donation processor. Recurring donations are deliberately NOT part of this
 * contract — they remain Stripe-only in the controller (Helcim recurring is out of scope this pass).
 */
export interface DonationProcessor {
  createOneTimeCheckout(params: OneTimeCheckoutParams): Promise<CheckoutInit>;
}
