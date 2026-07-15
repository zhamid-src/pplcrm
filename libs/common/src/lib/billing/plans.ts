/**
 * Subscription plans — the single source of truth for tiers, prices and limits.
 *
 * Consumed by:
 *  - backend enforcement  (modules/billing/usage-limits.ts, controller.ts, trpc.router.ts)
 *  - the CRM billing page (experiences/settings/billing)
 *  - the marketing website pricing page + home teaser
 *
 * Pricing model (decision log, 2026-07-14 — supersedes the flat-price 5-column model):
 *  - Three FEATURE tiers (Free / Grassroots / Movement). Which tier you're on is a feature
 *    decision. Within a tier, PRICE scales smoothly by emailable-subscriber bracket instead of
 *    stair-stepping between tiers — the old model jumped a customer 3.4× (Starter $29 →
 *    Representative $99) the moment they crossed one subscriber count. `representative` is
 *    retired. Feature split (revised 2026-07-14): newsletters are table stakes on EVERY plan
 *    including Free; forms, donations, automations, lists (segments) and volunteer management
 *    & monitoring are the paid step-up (Grassroots and up); the field-ops surface — both
 *    companion apps (canvassing & deliveries), yard signs, turf cutting, walk lists & routes,
 *    field reports, route optimization — plus A/B testing and the optional dedicated sending
 *    IP are Movement-only.
 *  - Meter the EMAILABLE-SUBSCRIBER count, NOT total contacts. A campaign can store its
 *    whole voter / canvassing universe for free (storage is cheap) and only pays for who it
 *    can actually email. This is the differentiator vs. contact-metered tools.
 *  - Stripe never learns about "subscribers" — each purchasable tier has ONE graduated Stripe
 *    price, and the app reports `quantity = 1-based bracket index` (see `bracketIndexForSubscribers`).
 *    All bracket→price/subscriber-cap/email-cap logic lives here, in `plans.ts`, as inspectable
 *    data; Stripe just multiplies quantity by its graduated unit amounts.
 *  - Emails/month = 12× the bracket's subscriber cap on paid tiers (matches Mailchimp
 *    Standard / Constant Contact Standard so no spec-sheet line shows pplCRM smaller). Free
 *    keeps 2×.
 *  - Monthly send, storage and seat caps protect the real COGS: SendGrid (newsletters),
 *    Postmark (transactional, scales with seats/activity) and Azure Blob (files).
 *  - Companion volunteers carry an auth-SMS cost — and the companion apps that use them are
 *    Movement-only.
 *  - Enterprise is dropped as a priced column (contact-us footnote only); the `enterprise`
 *    PlanKey stays valid internally for custom/negotiated tenants — `pricing: null` marks it.
 *  - All prices are USD.
 *
 * Market calibration (competitive research 2026-07-14; final ladder locked 2026-07-15, monthly
 * billing): Grassroots beats every full-suite competitor at every count — $69 vs $75 (Mailchimp
 * Essentials) at 5k, $89 vs $110 at 10k, $129 vs $230 at 20k, $219 vs beehiiv Scale's $199 at
 * 50k is the one near-miss (beehiiv is newsletter-only). Movement beats Mailchimp Standard at
 * every count — $125 vs $100 at 5k is the exception early on, but $195 vs $230 at 15k,
 * $365 vs $450 at 50k, $565 vs $800 at 100k. Roughly 1.8× Grassroots at every bracket —
 * "cheapest full-featured option" rather than "suspiciously cheap".
 *
 * Stripe ops (manual, not code — one graduated recurring price per purchasable tier;
 * `quantity` = the bracket index from `bracketIndexForSubscribers`):
 *  - Grassroots: [{ up_to: 1, unit_amount: 2900 }, { up_to: 7, unit_amount: 2000 }, { up_to: 'inf', unit_amount: 7000 }]
 *    → qty 1 = $29, qty 2–7 add $20/step (→ $149), qty 8–10 add $70/step (→ $359; the
 *    piecewise step change at the 25,000-subscriber boundary — see GRASSROOTS_BRACKETS below).
 *  - Movement: [{ up_to: 1, unit_amount: 5500 }, { up_to: 7, unit_amount: 3500 }, { up_to: 'inf', unit_amount: 10000 }]
 *    → qty 1 = $55, qty 2–7 add $35/step (→ $265), qty 8–11 add $100/step (→ $665; same
 *    piecewise step change at the 25,000-subscriber boundary — see MOVEMENT_BRACKETS below).
 *
 * Internal plan keys are persisted in `tenants.subscription_plan` and mapped to Stripe
 * price IDs. Display names are intentionally allowed to differ from keys, but here they are
 * kept aligned (`grassroots`→"Grassroots", `movement`→"Movement", …) except the free key,
 * which presents as "Free" (renamed from "Starter" in the 2026-07-14 overhaul —
 * `LEGACY_PLAN_ALIASES` resolves stale `starter` values written before the rename).
 */

export const GB = 1024 * 1024 * 1024;

/** Every plan key that can appear in `tenants.subscription_plan`. */
export type PlanKey = 'free' | 'grassroots' | 'movement' | 'enterprise';

/** Paid plans bought via self-serve Stripe checkout (excludes free and contact-sales enterprise). */
export const PURCHASABLE_PLAN_KEYS = ['grassroots', 'movement'] as const;
export type PurchasablePlanKey = (typeof PURCHASABLE_PLAN_KEYS)[number];

/** One row of a tier's price ladder. `upTo` is the inclusive emailable-subscriber cap; the
 * bracket's position in `TierPricing.brackets` (1-based) is the Stripe `quantity` billed for it. */
export interface PriceBracket {
  /** Emailable-subscriber cap of this bracket (inclusive). */
  readonly upTo: number;
  /** USD/month at this bracket. */
  readonly price: number;
}

/** A purchasable (or free) tier's full price ladder. `null` on `PlanDef.pricing` means the
 * tier has no ladder at all — currently only `enterprise` (custom, negotiated pricing). */
export interface TierPricing {
  /** Ascending by `upTo`. Index + 1 = the Stripe `quantity` for that bracket; the last
   * bracket's `upTo` is the tier's hard subscriber max. */
  readonly brackets: readonly PriceBracket[];
  /** Monthly send cap = this × the current bracket's `upTo` (12 on paid tiers, 2 on Free). */
  readonly emailsPerSubscriber: number;
}

export interface PlanDef {
  readonly key: PlanKey;
  /** Customer-facing name (may differ from key). */
  readonly name: string;
  /** Display cadence, e.g. 'per month' / 'forever' / 'contact us'. */
  readonly cadence: string;
  readonly blurb: string;
  /** Bracket price ladder. `null` = enterprise custom pricing (no ladder, no Stripe quantity). */
  readonly pricing: TierPricing | null;
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
  /** Shown as a priced column on pricing surfaces (false = enterprise, footnote-only). */
  readonly displayed: boolean;
  /** Marketing feature bullets shown on app-side billing cards (see FEATURE_MATRIX below for
   * the website's comparison-table view of the same feature split — keep both in sync). */
  readonly features: readonly string[];
}

/**
 * Grassroots ladder (final 2026-07-15 pricing) — $29 ≤1,000, +$20/bracket through 25,000, then
 * +$70/bracket to the 100,000 tier max (10 brackets). Bracket widths are non-uniform (1k → 2.5k
 * → 5k-wide steps → 25k-wide steps), so the ladder is spelled out literally rather than
 * generated. Price deltas stay Stripe-graduatable: +$20 ×6, then +$70 ×3 (see Stripe ops above).
 */
const GRASSROOTS_BRACKETS: readonly PriceBracket[] = [
  { upTo: 1_000, price: 29 },
  { upTo: 2_500, price: 49 },
  { upTo: 5_000, price: 69 },
  { upTo: 10_000, price: 89 },
  { upTo: 15_000, price: 109 },
  { upTo: 20_000, price: 129 },
  { upTo: 25_000, price: 149 },
  { upTo: 50_000, price: 219 },
  { upTo: 75_000, price: 289 },
  { upTo: 100_000, price: 359 },
];

/**
 * Movement ladder (final 2026-07-15 pricing) — $55 ≤1,000, +$35/bracket through 25,000, then
 * +$100/bracket to the 200,000 tier max (11 brackets). Same stops as Grassroots plus a final
 * 200,000 bracket; roughly 1.8× Grassroots at every shared stop. Price deltas stay
 * Stripe-graduatable: +$35 ×6, then +$100 ×4 (see Stripe ops above).
 */
const MOVEMENT_BRACKETS: readonly PriceBracket[] = [
  { upTo: 1_000, price: 55 },
  { upTo: 2_500, price: 90 },
  { upTo: 5_000, price: 125 },
  { upTo: 10_000, price: 160 },
  { upTo: 15_000, price: 195 },
  { upTo: 20_000, price: 230 },
  { upTo: 25_000, price: 265 },
  { upTo: 50_000, price: 365 },
  { upTo: 75_000, price: 465 },
  { upTo: 100_000, price: 565 },
  { upTo: 200_000, price: 665 },
];

export const PLANS: readonly PlanDef[] = [
  {
    key: 'free',
    name: 'Free',
    cadence: 'forever',
    blurb: 'For getting your bearings and running a small list.',
    pricing: { brackets: [{ upTo: 1_000, price: 0 }], emailsPerSubscriber: 2 },
    storageBytes: 1 * GB,
    seats: 2,
    volunteers: 0,
    purchasable: false,
    featured: false,
    displayed: true,
    features: [
      'Unlimited contacts & households',
      'Demo workspace with sample data',
      'Up to 1,000 email subscribers',
      '2,000 emails / month',
      '2 staff seats · 1 GB storage',
      'Shared inbox, people CRM & CSV import/export',
      'Newsletters, templates, scheduling & dynamic content',
      'Custom reports, role-based access & 300+ integrations',
      'Community support',
    ],
  },
  {
    key: 'grassroots',
    name: 'Grassroots',
    cadence: 'per month',
    blurb: 'For a local candidate or small campaign getting to work.',
    pricing: { brackets: GRASSROOTS_BRACKETS, emailsPerSubscriber: 12 },
    storageBytes: 10 * GB,
    seats: 5,
    volunteers: 15,
    purchasable: true,
    featured: false,
    displayed: true,
    features: [
      'Everything in Free, plus:',
      'Scales smoothly from $29/month as your list grows',
      'Up to 100,000 email subscribers · 12× emails/month',
      '5 staff seats · 15 volunteers · 10 GB storage',
      'Forms & donations',
      'Automations & lists (segments)',
      'Volunteer management & monitoring',
      'Email support',
    ],
  },
  {
    key: 'movement',
    name: 'Movement',
    cadence: 'per month',
    blurb: 'For a large campaign or advocacy operation at full tilt.',
    pricing: { brackets: MOVEMENT_BRACKETS, emailsPerSubscriber: 12 },
    storageBytes: 200 * GB,
    seats: null,
    volunteers: null,
    purchasable: true,
    featured: true,
    displayed: true,
    features: [
      'Everything in Grassroots, plus:',
      'Scales smoothly from $55/month as your list grows',
      'Up to 200,000 email subscribers · 12× emails/month',
      'Unlimited staff seats & volunteers · 200 GB storage',
      'Canvassing & deliveries companion apps',
      'Yard signs & route optimization',
      'Turf cutting, walk lists & routes, field reports',
      'A/B testing & optional dedicated sending IP',
      'Choose your data residency region (US, EU, Canada or UK)',
      'Priority support & onboarding',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    cadence: 'contact us',
    blurb: 'For federations, parties and multi-office operations.',
    pricing: null,
    storageBytes: null,
    seats: null,
    volunteers: null,
    purchasable: false,
    featured: false,
    displayed: false,
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

/** Stale plan values that must still resolve after the 2026-07-14 tier rename/retirement:
 * `representative` (retired, features split into grassroots/movement — nearest fit is
 * movement) and `starter` (renamed to `free`). Resolved case-insensitively by `getPlanDef`. */
export const LEGACY_PLAN_ALIASES: Readonly<Record<string, PlanKey>> = {
  representative: 'movement',
  starter: 'free',
};

/** Resolve a (possibly mixed-case, possibly legacy) stored plan value to its definition. */
export function getPlanDef(planName: string | null | undefined): PlanDef | undefined {
  if (!planName) return undefined;
  const key = planName.toLowerCase();
  const resolvedKey = LEGACY_PLAN_ALIASES[key] ?? key;
  return (PLANS_BY_KEY as Record<string, PlanDef | undefined>)[resolvedKey];
}

/** Customer-facing display name for a stored plan value (falls back to the raw value). */
export function planDisplayName(planName: string | null | undefined): string {
  return getPlanDef(planName)?.name ?? (planName ? planName : 'Free');
}

/**
 * 1-based Stripe quantity for an emailable-subscriber count on the given plan, or `null` when
 * the count exceeds the tier's max bracket (caller should treat this as "outgrown the tier").
 * A count of 0 still bills quantity 1 (every purchasable plan has a non-zero minimum charge).
 * Plans with no pricing ladder (enterprise) always return `null` — quantity is meaningless there.
 */
export function bracketIndexForSubscribers(key: PlanKey, count: number): number | null {
  const pricing = PLANS_BY_KEY[key].pricing;
  if (!pricing) return null;
  const normalizedCount = Math.max(count, 0);
  const index = pricing.brackets.findIndex((bracket) => normalizedCount <= bracket.upTo);
  return index === -1 ? null : index + 1;
}

/** The highest valid Stripe quantity (= number of brackets) for a plan. `Infinity` for plans
 * with no pricing ladder (enterprise — no quantity ceiling applies). */
export function maxQuantity(key: PlanKey): number {
  const pricing = PLANS_BY_KEY[key].pricing;
  return pricing ? pricing.brackets.length : Infinity;
}

/** The price bracket for a given Stripe quantity, clamping `qty` into the valid `[1, maxQuantity]`
 * range. Throws only if called against a plan with no pricing ladder (enterprise) — callers
 * should guard with `PLANS_BY_KEY[key].pricing !== null` first; purchasable/free plans always
 * have at least one bracket. */
export function bracketForQuantity(key: PlanKey, qty: number): PriceBracket {
  const pricing = PLANS_BY_KEY[key].pricing;
  if (!pricing) {
    throw new Error(`plan "${key}" has no pricing ladder (enterprise is custom-priced)`);
  }
  const max = pricing.brackets.length;
  const clampedIndex = Math.min(Math.max(qty, 1), max) - 1;
  const bracket = pricing.brackets[clampedIndex];
  if (!bracket) {
    // Unreachable: clampedIndex is always within [0, brackets.length - 1] above.
    throw new Error(`unreachable: no bracket at index ${clampedIndex} for plan "${key}"`);
  }
  return bracket;
}

/** Emailable-subscriber cap for a Stripe quantity on a plan. */
export function subscriberCapForQuantity(key: PlanKey, qty: number): number {
  return bracketForQuantity(key, qty).upTo;
}

/** Monthly email-send cap for a Stripe quantity on a plan (= subscriber cap × the plan's
 * `emailsPerSubscriber` multiplier). */
export function emailCapForQuantity(key: PlanKey, qty: number): number {
  const pricing = PLANS_BY_KEY[key].pricing;
  const multiplier = pricing?.emailsPerSubscriber ?? 0;
  return subscriberCapForQuantity(key, qty) * multiplier;
}

/** USD/month price for a Stripe quantity on a plan. */
export function priceForQuantity(key: PlanKey, qty: number): number {
  return bracketForQuantity(key, qty).price;
}

/** Short "starting at" label for a plan card, e.g. '$0' (free), 'From $29' (grassroots),
 * 'From $55' (movement), 'Custom' (enterprise). */
export function startingPriceLabel(plan: PlanDef): string {
  if (!plan.pricing) return 'Custom';
  const first = plan.pricing.brackets[0];
  if (!first) {
    // Unreachable: every non-null TierPricing in PLANS has at least one bracket.
    throw new Error(`unreachable: plan "${plan.key}" pricing has no brackets`);
  }
  return first.price === 0 ? '$0' : `From $${first.price}`;
}

/** Numeric USD "starting at" price for a plan (0 = free, `null` = enterprise/custom, no ladder).
 * The numeric sibling of `startingPriceLabel`, for surfaces that convert prices to another
 * display currency (the marketing site's home teaser). */
export function startingPriceUsd(plan: PlanDef): number | null {
  if (!plan.pricing) return null;
  const first = plan.pricing.brackets[0];
  if (!first) {
    // Unreachable: every non-null TierPricing in PLANS has at least one bracket.
    throw new Error(`unreachable: plan "${plan.key}" pricing has no brackets`);
  }
  return first.price;
}

/** Live price label for a plan at a given emailable-subscriber count, e.g. '$69' (in-ladder),
 * 'Contact us' (past the tier's max bracket), 'Custom' (enterprise, no ladder). Used by the
 * website pricing slider and the frontend billing upgrade cards. */
export function priceLabelAt(plan: PlanDef, subscribers: number): string {
  if (!plan.pricing) return 'Custom';
  const index = bracketIndexForSubscribers(plan.key, subscribers);
  if (index === null) return 'Contact us';
  return `$${priceForQuantity(plan.key, index)}`;
}

/** Capability ordering of the tiers — used by `planAllowsFeature` for min-plan gating. */
const PLAN_RANK: Record<PlanKey, number> = { free: 0, grassroots: 1, movement: 2, enterprise: 3 };

/**
 * Server-enforced feature gates — the machine-readable core of FEATURE_MATRIX below (keep the
 * two in sync when a feature moves between tiers). The backend's plan-gate middleware
 * (apps/backend modules/billing/plan-gate.ts) blocks mutations in a gated module for tenants
 * below the feature's minimum plan.
 */
export const GATED_FEATURES = {
  forms: { minPlan: 'grassroots', label: 'Forms' },
  donations: { minPlan: 'grassroots', label: 'Donations' },
  automations: { minPlan: 'grassroots', label: 'Automations' },
  lists: { minPlan: 'grassroots', label: 'Lists (segments)' },
  volunteers: { minPlan: 'grassroots', label: 'Volunteer management' },
  canvassing: { minPlan: 'movement', label: 'Canvassing' },
  deliveries: { minPlan: 'movement', label: 'Deliveries' },
} as const satisfies Record<string, { minPlan: PlanKey; label: string }>;

export type GatedFeature = keyof typeof GATED_FEATURES;

/** Whether a (possibly legacy/mixed-case) stored plan value includes a gated feature. */
export function planAllowsFeature(planName: string | null | undefined, feature: GatedFeature): boolean {
  const plan = getPlanDef(planName) ?? PLANS_BY_KEY.free;
  return PLAN_RANK[plan.key] >= PLAN_RANK[GATED_FEATURES[feature].minPlan];
}

/** Regions a Movement customer can choose to store their data in, set when they create their
 * workspace. Single-sourced so the plan bullet, the comparison-table cell and any FAQ/help copy
 * stay in agreement. (Display-only on the marketing site; the actual choice happens at signup.) */
export const DATA_RESIDENCY_REGIONS = ['US', 'EU', 'Canada', 'UK'] as const;
export type DataResidencyRegion = (typeof DATA_RESIDENCY_REGIONS)[number];

/** The residency regions as a single comparison-cell / bullet label, e.g. "US · EU · Canada · UK". */
export const DATA_RESIDENCY_LABEL = DATA_RESIDENCY_REGIONS.join(' · ');

/**
 * Shared feature-comparison matrix — drives the website's Mailchimp-style comparison table
 * (plan-header cards + feature rows). This is a SEPARATE data source from each PlanDef's
 * `features[]` bullet list (which drives the app-side billing cards): `features[]` is a short,
 * narrative "everything in X, plus Y" list; `FEATURE_MATRIX` is an exhaustive row-by-row grid.
 * They describe the same feature split from two different plan keys, so keep them in sync by
 * hand when a feature moves between tiers — there is no single source both surfaces read from.
 */
export interface FeatureMatrixRow {
  readonly label: string;
  /** true = ✓, false = ✗, string = a text cell (e.g. "Up to 1,000", "2 seats"). */
  readonly values: Readonly<Record<'free' | 'grassroots' | 'movement', boolean | string>>;
}

export interface FeatureMatrixGroup {
  readonly category: string;
  readonly rows: readonly FeatureMatrixRow[];
}

export const FEATURE_MATRIX: readonly FeatureMatrixGroup[] = [
  {
    category: 'Usage',
    rows: [
      {
        label: 'Emailable subscribers',
        values: { free: 'Up to 1,000', grassroots: 'Up to 100,000', movement: 'Up to 200,000' },
      },
      {
        label: 'Emails / month',
        values: { free: '2,000', grassroots: '12× your subscriber cap', movement: '12× your subscriber cap' },
      },
      { label: 'File storage', values: { free: '1 GB', grassroots: '10 GB', movement: '200 GB' } },
      { label: 'Staff seats', values: { free: '2', grassroots: '5', movement: 'Unlimited' } },
      { label: 'Companion volunteers', values: { free: '0', grassroots: '15', movement: 'Unlimited' } },
    ],
  },
  {
    category: 'Everything in every plan',
    rows: [
      { label: 'Unlimited contacts & households', values: { free: true, grassroots: true, movement: true } },
      { label: 'People CRM + shared inbox', values: { free: true, grassroots: true, movement: true } },
      { label: 'CSV import/export', values: { free: true, grassroots: true, movement: true } },
      { label: 'Newsletters', values: { free: true, grassroots: true, movement: true } },
      { label: 'Pre-built templates', values: { free: true, grassroots: true, movement: true } },
      { label: 'Custom-coded templates', values: { free: true, grassroots: true, movement: true } },
      { label: 'Email scheduling', values: { free: true, grassroots: true, movement: true } },
      { label: 'Dynamic content', values: { free: true, grassroots: true, movement: true } },
      { label: 'Custom reports', values: { free: true, grassroots: true, movement: true } },
      { label: 'Role-based access', values: { free: true, grassroots: true, movement: true } },
      { label: '300+ integrations', values: { free: true, grassroots: true, movement: true } },
      { label: 'Demo workspace', values: { free: true, grassroots: true, movement: true } },
    ],
  },
  {
    category: 'Grow & engage',
    rows: [
      { label: 'Forms', values: { free: false, grassroots: true, movement: true } },
      { label: 'Donations', values: { free: false, grassroots: true, movement: true } },
      { label: 'Automations', values: { free: false, grassroots: true, movement: true } },
      { label: 'Lists (segments)', values: { free: false, grassroots: true, movement: true } },
      {
        label: 'Volunteer management & monitoring',
        values: { free: false, grassroots: true, movement: true },
      },
    ],
  },
  {
    category: 'Canvassing',
    rows: [
      { label: 'Canvassing companion app', values: { free: false, grassroots: false, movement: true } },
      { label: 'Turf cutting', values: { free: false, grassroots: false, movement: true } },
      { label: 'Walk lists & routes', values: { free: false, grassroots: false, movement: true } },
      { label: 'Field reports', values: { free: false, grassroots: false, movement: true } },
    ],
  },
  {
    category: 'Deliveries',
    rows: [
      { label: 'Deliveries companion app', values: { free: false, grassroots: false, movement: true } },
      { label: 'Yard sign requests', values: { free: false, grassroots: false, movement: true } },
      { label: 'Route optimization', values: { free: false, grassroots: false, movement: true } },
      { label: 'Delivery monitoring', values: { free: false, grassroots: false, movement: true } },
    ],
  },
  {
    category: 'Movement only',
    rows: [
      { label: 'A/B testing', values: { free: false, grassroots: false, movement: true } },
      { label: 'Dedicated sending IP (optional)', values: { free: false, grassroots: false, movement: true } },
      {
        label: 'Data residency',
        values: { free: false, grassroots: false, movement: DATA_RESIDENCY_LABEL },
      },
      {
        label: 'Support',
        values: { free: 'Community', grassroots: 'Email', movement: 'Priority + onboarding' },
      },
    ],
  },
];
