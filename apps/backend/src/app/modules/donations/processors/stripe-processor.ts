import { env } from '../../../../env';
import { getStripe, isMockMode } from '../../../lib/stripe-platform-client';
import type { CheckoutInit, DonationProcessor, OneTimeCheckoutParams } from './donation-processor';

/**
 * Stripe one-time checkout adapter — Connect direct charges. The session is created with the
 * PLATFORM key against the tenant's connected account (`{ stripeAccount }`), so the campaign is
 * merchant of record and pays Stripe's processing fees itself; the platform takes
 * `payment_intent_data.application_fee_amount` (DONATIONS_PLATFORM_FEE_PERCENT of the gift).
 * Session params/metadata/success+cancel URLs are unchanged from the pre-Connect implementation.
 * Mock mode keys off the platform client (same `MockKey` convention as billing).
 */
export class StripeDonationProcessor implements DonationProcessor {
  constructor(private readonly config: { accountId: string | undefined; feePercent: number }) {}

  public async createOneTimeCheckout(params: OneTimeCheckoutParams): Promise<CheckoutInit> {
    const { tenantId, userId, personId, amountCents, address, customUrls } = params;

    if (isMockMode) {
      const mockSessionId = 'cs_mock_' + Math.random().toString(36).substring(7);
      let redirectBase = customUrls?.successUrl
        ? customUrls.successUrl.replace('{CHECKOUT_SESSION_ID}', mockSessionId)
        : `${env.appUrl}/people/${personId}?mock_donation_success=true&amount=${amountCents / 100}&session_id=${mockSessionId}&province=${address.state || ''}&country=${address.country || ''}`;

      if (customUrls?.successUrl) {
        const separator = redirectBase.includes('?') ? '&' : '?';
        redirectBase += `${separator}is_mock=true&person_id=${personId}&amount_cents=${amountCents}&province=${encodeURIComponent(address.state || '')}&country=${encodeURIComponent(address.country || '')}&tenant_id=${tenantId}&user_id=${userId}`;
      }

      return { kind: 'redirect', url: redirectBase };
    }

    const applicationFeeCents = platformFeeCents(amountCents, this.config.feePercent);

    const session = await getStripe().checkout.sessions.create(
      {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'cad',
              product_data: { name: 'Campaign Donation' },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        ...(applicationFeeCents > 0 ? { payment_intent_data: { application_fee_amount: applicationFeeCents } } : {}),
        success_url:
          customUrls?.successUrl ||
          `${env.appUrl}/people/${personId}?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: customUrls?.cancelUrl || `${env.appUrl}/people/${personId}?checkout_cancel=true`,
        metadata: {
          tenantId,
          personId,
          amount: String(amountCents),
          residencyProvince: address.state || '',
          residencyCountry: address.country || '',
          createdBy: userId,
        },
      },
      { stripeAccount: this.config.accountId },
    );

    return { kind: 'redirect', url: session.url };
  }
}

/** Platform application fee in cents; 0 means "omit the field" (Stripe rejects a 0 fee). */
export function platformFeeCents(amountCents: number, feePercent: number): number {
  return Math.max(0, Math.round((amountCents * feePercent) / 100));
}
