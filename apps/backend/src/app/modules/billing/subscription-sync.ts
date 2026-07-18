import { TenantsRepo } from '../auth/repositories/tenants.repo';
import { logger } from '../../logger';
import { getStripe, isMockMode } from '../../lib/stripe-platform-client';

const tenantsRepo = new TenantsRepo();

/** The subset of `tenants` columns `syncSubscriptionQuantity` needs — `getOneBy` selects every
 * column (no subset requested), so narrowing to just these is honest, not a type lie; see
 * pplcrm-any-exceptions §2. */
interface TenantSubscriptionRow {
  stripe_subscription_id: string | null;
}

function asTenantSubscriptionRow(row: unknown): TenantSubscriptionRow | undefined {
  if (!row || typeof row !== 'object') return undefined;
  const value = (row as Record<string, unknown>)['stripe_subscription_id'];
  return { stripe_subscription_id: typeof value === 'string' ? value : null };
}

/**
 * Sync a tenant's billed Stripe `quantity` (the 1-based bracket index — see
 * `libs/common/src/lib/billing/plans.ts`) to `quantity`.
 *
 * - **Mock mode:** no live Stripe subscription exists, so this just writes
 *   `tenants.subscription_quantity` directly.
 * - **Live mode:** fetches the live subscription; if its single item's quantity already equals
 *   `quantity`, this is an idempotent no-op. Otherwise it calls `stripe.subscriptions.update`
 *   and writes the column optimistically — the `customer.subscription.updated` webhook
 *   re-syncs it authoritatively afterward. Proration depends on the direction of the change:
 *   - **Any increase** (monthly or annual): `proration_behavior: 'always_invoice'` — Stripe
 *     invoices the prorated difference for the remainder of the current period immediately.
 *     Deferring to renewal would let a tenant buy the lowest bracket, grow into a big send,
 *     then cancel before the higher bracket ever billed. It also keeps the invariant the
 *     send-time email allowance relies on: `subscription_quantity` is always a PAID-FOR
 *     bracket (see newsletters/send-guards.ts).
 *   - **Any decrease**: `proration_behavior: 'none'` — downgrades reconcile at the cycle
 *     boundary (`invoice.paid`), never as a mid-cycle credit.
 *
 * Split out of `controller.ts` into its own module (rather than exported from there) so
 * `usage-limits.ts` can import it without creating an import cycle with `controller.ts` (which
 * itself imports `getPlanLimits` from `usage-limits.ts`).
 */
export async function syncSubscriptionQuantity(tenantId: string, quantity: number): Promise<void> {
  if (isMockMode) {
    await tenantsRepo.update({
      tenant_id: tenantId,
      id: tenantId,
      row: { subscription_quantity: quantity },
    });
    return;
  }

  const tenantRow = asTenantSubscriptionRow(
    await tenantsRepo.getOneBy('id', {
      tenant_id: tenantId,
      value: tenantId,
    }),
  );

  const subscriptionId = tenantRow?.stripe_subscription_id;
  if (!subscriptionId) {
    logger.warn(`[syncSubscriptionQuantity] Tenant ${tenantId} has no Stripe subscription — skipping sync`);
    return;
  }

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const item = subscription.items.data[0];
  if (!item) {
    logger.warn(`[syncSubscriptionQuantity] Tenant ${tenantId}'s subscription has no line items — skipping sync`);
    return;
  }

  if (item.quantity === quantity) {
    return; // Already in sync — idempotent no-op.
  }

  const isIncrease = quantity > (item.quantity ?? 0);

  await getStripe().subscriptions.update(subscriptionId, {
    items: [{ id: item.id, quantity }],
    proration_behavior: isIncrease ? 'always_invoice' : 'none',
  });

  await tenantsRepo.update({
    tenant_id: tenantId,
    id: tenantId,
    row: { subscription_quantity: quantity },
  });
}
