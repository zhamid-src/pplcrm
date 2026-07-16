import Stripe from 'stripe';
import { env } from '../../env';

/** The single platform Stripe client + mock-mode flag, shared by billing (platform subscriptions)
 * and donations (Connect direct charges on tenant connected accounts via `{ stripeAccount }`
 * request options). Lives in lib/ so neither module imports from the other. */
const stripeSecretKey = env.stripeSecretKey;
export const stripe = stripeSecretKey && !stripeSecretKey.includes('MockKey') ? new Stripe(stripeSecretKey) : null;
export const isMockMode = stripe === null;

export function getStripe(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured (running in mock mode)');
  }
  return stripe;
}
