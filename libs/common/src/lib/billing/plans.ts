/**
 * Subscription plans — the single source of truth for tiers, prices and limits.
 *
 * Consumed by:
 *  - backend enforcement  (modules/billing/usage-limits.ts, controller.ts, trpc.router.ts)
 *  - the CRM billing page (experiences/settings/billing)
 *  - the marketing website pricing page + home teaser
 *
 * Pricing model (decision log, 2026-07):
 *  - Meter the EMAILABLE-SUBSCRIBER count, NOT total contacts. A campaign can store its
 *    whole voter / canvassing universe for free (storage is cheap) and only pays for who it
 *    can actually email. This is the differentiator vs. contact-metered tools.
 *  - Monthly send, storage and seat caps protect the real COGS: SendGrid (newsletters),
 *    Postmark (transactional, scales with seats/activity) and Azure Blob (files).
 *  - Companion volunteers carry an auth-SMS cost, so they are gated to paid tiers.
 *  - All prices are USD.
 *
 * Internal plan keys are persisted in `tenants.subscription_plan` and mapped to Stripe
 * price IDs. Display names are intentionally allowed to differ from keys, but here they are
 * kept aligned (`grassroots`→"Grassroots", `representative`→"Representative", …) except the
 * free key which presents as "Starter".
 */

export const GB = 1024 * 1024 * 1024;

/** Every plan key that can appear in `tenants.subscription_plan`. */
export type PlanKey = 'free' | 'grassroots' | 'representative' | 'movement' | 'enterprise';

/** Paid plans bought via self-serve Stripe checkout (excludes free and contact-sales enterprise). */
export const PURCHASABLE_PLAN_KEYS = ['grassroots', 'representative', 'movement'] as const;
export type PurchasablePlanKey = (typeof PURCHASABLE_PLAN_KEYS)[number];

export interface PlanDef {
  readonly key: PlanKey;
  /** Customer-facing name (may differ from key). */
  readonly name: string;
  /** Display price, e.g. '$29' or 'Custom'. */
  readonly price: string;
  /** Display cadence, e.g. 'per month' / 'forever' / 'contact us'. */
  readonly cadence: string;
  readonly blurb: string;
  /** Emailable-subscriber cap. null = unlimited / custom. */
  readonly subscribers: number | null;
  /** Monthly outbound email (newsletter + shared-inbox) send cap. null = unlimited / custom. */
  readonly emails: number | null;
  /** File-storage quota in bytes. null = unlimited / custom. */
  readonly storageBytes: number | null;
  /** Included staff seats. null = unlimited. */
  readonly seats: number | null;
  /** Included companion volunteers. 0 = none, null = unlimited. */
  readonly volunteers: number | null;
  /** Bought via self-serve Stripe checkout (false for free + enterprise). */
  readonly purchasable: boolean;
  /** Highlighted as the recommended tier. */
  readonly featured: boolean;
  /** Marketing feature bullets shown on both pricing surfaces. */
  readonly features: readonly string[];
}

export const PLANS: readonly PlanDef[] = [
  {
    key: 'free',
    name: 'Starter',
    price: '$0',
    cadence: 'forever',
    blurb: 'For getting your bearings and running a small list.',
    subscribers: 1_000,
    emails: 2_000,
    storageBytes: 1 * GB,
    seats: 2,
    volunteers: 0,
    purchasable: false,
    featured: false,
    features: [
      'Unlimited contacts & households',
      'Demo workspace with sample data',
      '1,000 email subscribers',
      '2,000 emails / month',
      '2 staff seats',
      '1 GB file storage',
      'Shared inbox, people CRM & CSV import/export',
      'Community support',
    ],
  },
  {
    key: 'grassroots',
    name: 'Grassroots',
    price: '$29',
    cadence: 'per month',
    blurb: 'For a local candidate or small campaign getting to work.',
    subscribers: 5_000,
    emails: 30_000,
    storageBytes: 10 * GB,
    seats: 5,
    volunteers: 15,
    purchasable: true,
    featured: false,
    features: [
      'Everything in Starter, plus:',
      '5,000 email subscribers',
      '30,000 emails / month',
      '5 staff seats · 15 volunteers',
      '10 GB file storage',
      'Companion apps — canvassing & deliveries',
      'Newsletters, donations & yard signs',
      'Email support',
    ],
  },
  {
    key: 'representative',
    name: 'Representative',
    price: '$99',
    cadence: 'per month',
    blurb: 'For an office or campaign running the whole playbook.',
    subscribers: 25_000,
    emails: 150_000,
    storageBytes: 50 * GB,
    seats: 15,
    volunteers: 75,
    purchasable: true,
    featured: true,
    features: [
      'Everything in Grassroots, plus:',
      '25,000 email subscribers',
      '150,000 emails / month',
      '15 staff seats · 75 volunteers',
      '50 GB file storage',
      'Turf cutting, field reports & routes',
      'Automations, segments & A/B testing',
      'Priority support',
    ],
  },
  {
    key: 'movement',
    name: 'Movement',
    price: '$249',
    cadence: 'per month',
    blurb: 'For a large campaign or advocacy operation at full tilt.',
    subscribers: 100_000,
    emails: 600_000,
    storageBytes: 200 * GB,
    seats: null,
    volunteers: null,
    purchasable: true,
    featured: false,
    features: [
      'Everything in Representative, plus:',
      '100,000 email subscribers',
      '600,000 emails / month',
      'Unlimited staff seats & volunteers',
      '200 GB file storage',
      'Optional dedicated sending IP',
      'Priority support & onboarding',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    cadence: 'contact us',
    blurb: 'For federations, parties and multi-office operations.',
    subscribers: null,
    emails: null,
    storageBytes: null,
    seats: null,
    volunteers: null,
    purchasable: false,
    featured: false,
    features: [
      'Everything in Movement, plus:',
      'Unlimited subscribers & sends',
      'Multiple linked workspaces',
      'Single sign-on (SSO)',
      'Data residency by region',
      'Dedicated IP & custom integrations',
      'SLA support & guided onboarding',
    ],
  },
];

export const PLANS_BY_KEY: Record<PlanKey, PlanDef> = PLANS.reduce(
  (acc, plan) => {
    acc[plan.key] = plan;
    return acc;
  },
  {} as Record<PlanKey, PlanDef>,
);

/** Resolve a (possibly mixed-case or unknown) stored plan value to its definition. */
export function getPlanDef(planName: string | null | undefined): PlanDef | undefined {
  if (!planName) return undefined;
  const key = planName.toLowerCase();
  return (PLANS_BY_KEY as Record<string, PlanDef | undefined>)[key];
}

/** Customer-facing display name for a stored plan value (falls back to the raw value). */
export function planDisplayName(planName: string | null | undefined): string {
  return getPlanDef(planName)?.name ?? (planName ? planName : 'Free');
}
