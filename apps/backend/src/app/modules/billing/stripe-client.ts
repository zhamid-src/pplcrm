import Stripe from 'stripe';
import { env } from '../../../env';

/** Shared Stripe client + mock-mode flag. Split out of `controller.ts` so `subscription-sync.ts`
 * (imported by both `controller.ts` and `usage-limits.ts`) doesn't create an import cycle. */
const stripeSecretKey = env.stripeSecretKey;
export const stripe = stripeSecretKey && !stripeSecretKey.includes('MockKey') ? new Stripe(stripeSecretKey) : null;
export const isMockMode = stripe === null;

export function getStripe(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured (running in mock mode)');
  }
  return stripe;
}
