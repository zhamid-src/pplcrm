import Stripe from 'stripe';

import { env } from '../../../../env';
import type { CheckoutInit, DonationProcessor, OneTimeCheckoutParams } from './donation-processor';

/**
 * Stripe one-time checkout adapter. This is the EXACT logic that used to live inline in
 * DonationsController.createCheckoutSession (mock branch + `new Stripe` + `checkout.sessions.create`
 * with identical params/metadata/success+cancel URLs), moved verbatim so Stripe behavior is
 * byte-for-byte unchanged. The tenant Stripe key (already resolved to the tenant key or the env
 * fallback) is injected; the mock-mode detection is identical to the original.
 */
export class StripeDonationProcessor implements DonationProcessor {
  constructor(private readonly stripeKey: string | undefined) {}

  public async createOneTimeCheckout(params: OneTimeCheckoutParams): Promise<CheckoutInit> {
    const { tenantId, userId, personId, amountCents, address, customUrls } = params;

    const tenantStripeKey = this.stripeKey;
    const isMock = !tenantStripeKey || tenantStripeKey.includes('MockKey') || tenantStripeKey === '';

    if (isMock) {
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

    const stripe = new Stripe(tenantStripeKey);

    const session = await stripe.checkout.sessions.create({
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
    });

    return { kind: 'redirect', url: session.url };
  }
}
