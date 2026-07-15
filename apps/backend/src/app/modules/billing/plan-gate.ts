import type { Kysely, Transaction } from 'kysely';
import { TRPCError } from '@trpc/server';

import { GATED_FEATURES, PLANS_BY_KEY, planAllowsFeature, type GatedFeature } from '@common';
import type { Models } from '../../../../../../libs/common/src/lib/kysely.models';
import { ForbiddenError } from '../../errors/app-errors';
import { BaseRepository } from '../../lib/base.repo';
import { middleware } from '../../../trpc';

/**
 * Server-side enforcement of the FEATURE_MATRIX plan split (GATED_FEATURES in
 * libs/common/src/lib/billing/plans.ts). The matrix data alone is only marketing copy — this
 * gate is the contract: tenants below a feature's minimum plan cannot mutate through the
 * feature's module. Reads intentionally stay open so a downgraded tenant can still see (and
 * export) data it created while entitled — disclosure over suppression.
 */
export function planGateMessage(feature: GatedFeature): string {
  const { label, minPlan } = GATED_FEATURES[feature];
  return `${label} requires the ${PLANS_BY_KEY[minPlan].name} plan or higher. Upgrade on the Billing page to unlock it.`;
}

/** Throws FORBIDDEN when the tenant's plan does not include the gated feature. */
export async function assertPlanFeature(
  db: Kysely<Models> | Transaction<Models>,
  tenant_id: string,
  feature: GatedFeature,
): Promise<void> {
  const tenant = await db
    .selectFrom('tenants')
    .select('subscription_plan')
    .where('id', '=', tenant_id)
    .executeTakeFirst();
  if (!planAllowsFeature(tenant?.subscription_plan, feature)) {
    throw new ForbiddenError(planGateMessage(feature));
  }
}

/**
 * tRPC middleware form of the gate for use on `authProcedure` (after `isAuthed`). Only
 * mutations are blocked — see the module doc above for why reads pass.
 */
export function planFeatureGate(feature: GatedFeature) {
  return middleware(async (opts) => {
    if (opts.type === 'mutation') {
      const tenantId = opts.ctx.auth?.tenant_id;
      if (!tenantId) throw new TRPCError({ code: 'UNAUTHORIZED' });
      await assertPlanFeature(BaseRepository.dbInstance, tenantId, feature);
    }
    return opts.next();
  });
}
