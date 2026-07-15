import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the Stripe SDK so we can assert the exact Checkout Session params without any network call.
const { createSession } = vi.hoisted(() => ({ createSession: vi.fn() }));
vi.mock('stripe', () => ({
  default: class {
    public checkout = { sessions: { create: createSession } };
    constructor(public readonly key: string) {}
  },
}));

import { env } from '../../../../env';
import { StripeDonationProcessor } from './stripe-processor';

describe('StripeDonationProcessor.createOneTimeCheckout', () => {
  beforeEach(() => {
    createSession.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds the same one-time Checkout Session params as before (behavior-preserving)', async () => {
    createSession.mockResolvedValue({ url: 'https://stripe.example/session_123' });

    const processor = new StripeDonationProcessor('sk_live_realkey');
    const result = await processor.createOneTimeCheckout({
      tenantId: '42',
      userId: '7',
      personId: '99',
      amountCents: 5000,
      address: { country: 'CA', state: 'ON' },
    });

    expect(result).toEqual({ kind: 'redirect', url: 'https://stripe.example/session_123' });
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(createSession).toHaveBeenCalledWith({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: { name: 'Campaign Donation' },
            unit_amount: 5000,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${env.appUrl}/people/99?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.appUrl}/people/99?checkout_cancel=true`,
      metadata: {
        tenantId: '42',
        personId: '99',
        amount: '5000',
        residencyProvince: 'ON',
        residencyCountry: 'CA',
        createdBy: '7',
      },
    });
  });

  it('honors custom success/cancel URLs', async () => {
    createSession.mockResolvedValue({ url: 'https://stripe.example/session_456' });
    const processor = new StripeDonationProcessor('sk_live_realkey');
    await processor.createOneTimeCheckout({
      tenantId: '1',
      userId: '2',
      personId: '3',
      amountCents: 1000,
      address: {},
      customUrls: { successUrl: 'https://app/success?sid={CHECKOUT_SESSION_ID}', cancelUrl: 'https://app/cancel' },
    });
    const params = createSession.mock.calls[0][0];
    expect(params.success_url).toBe('https://app/success?sid={CHECKOUT_SESSION_ID}');
    expect(params.cancel_url).toBe('https://app/cancel');
  });

  it('takes the mock branch (no Stripe call) when the key is empty/mock', async () => {
    const processor = new StripeDonationProcessor(undefined);
    const result = await processor.createOneTimeCheckout({
      tenantId: '42',
      userId: '7',
      personId: '99',
      amountCents: 5000,
      address: { country: 'CA', state: 'ON' },
    });
    expect(createSession).not.toHaveBeenCalled();
    expect(result.kind).toBe('redirect');
    if (result.kind === 'redirect') {
      expect(result.url).toContain('/people/99?mock_donation_success=true');
      expect(result.url).toContain('session_id=cs_mock_');
    }
  });
});
