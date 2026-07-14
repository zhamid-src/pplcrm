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
 * Market calibration (competitive research 2026-07-14, monthly billing): Grassroots beats
 * every full-suite competitor at every count — $49 vs $75 (Mailchimp Essentials) at 5k,
 * $69 vs $110 at 10k, $109 vs $230 at 20k; only newsletter-only beehiiv Scale undercuts it at
 * 50k ($199 vs $229). Movement beats Mailchimp Standard at every count — $75 vs $100 at 5k,
 * $155 vs $230 at 15k, $375 vs $450 at 50k, $675 vs $800 at 100k. Not 75% under — 20–35% under,
 * "cheapest full-featured option" rather than "suspiciously cheap".
 *
 * Stripe ops (manual, not code — one graduated recurring price per purchasable tier;
 * `quantity` = the bracket index from `bracketIndexForSubscribers`):
 *  - Grassroots: [{ up_to: 1, unit_amount: 2900 }, { up_to: 'inf', unit_amount: 2000 }]
 *    → qty 1 = $29, qty N (N ≥ 2) = $29 + $20·(N−1) = the bracket ladder below.
 *  - Movement: [{ up_to: 1, unit_amount: 7500 }, { up_to: 4, unit_amount: 4000 }, { up_to: 'inf', unit_amount: 3000 }]
 *    → qty 1 = $75, qty 2–4 add $40/step, qty 5+ add $30/step (the piecewise step change at
 *    the 20,000-subscriber boundary — see MOVEMENT_BRACKETS below).
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
 * Build one evenly-stepped run of brackets. `fromUpTo` is the emailable-subscriber cap of the
 * run's FIRST bracket, priced at `startPrice`; each subsequent bracket steps `upTo` by `step`
 * and price by `pricePerStep`, up to and including `toUpTo`. Tiers concatenate one or more
 * runs (plus, where the first bracket doesn't fit the pattern, literal leading brackets) to
 * build their full ladder — see GRASSROOTS_BRACKETS / MOVEMENT_BRACKETS below.
 */
function linearBrackets(
  fromUpTo: number,
  toUpTo: number,
  step: number,
  startPrice: number,
  pricePerStep: number,
): PriceBracket[] {
  const brackets: PriceBracket[] = [];
  for (let upTo = fromUpTo, price = startPrice; upTo <= toUpTo; upTo += step, price += pricePerStep) {
    brackets.push({ upTo, price });
  }
  return brackets;
}

/**
 * Grassroots ladder — $29 ≤2,500 · $49 ≤5,000 · then +$20 per 5,000 up to 50,000 (11 brackets).
 * Spot prices (qty = 1-based index): 1:$29 (2.5k) · 2:$49 (5k) · 3:$69 (10k) · 4:$89 (15k) ·
 * 5:$109 (20k) · 6:$129 (25k) · 7:$149 (30k) · 8:$169 (35k) · 9:$189 (40k) · 10:$209 (45k) ·
 * 11:$229 (50k, tier max).
 */
const GRASSROOTS_BRACKETS: readonly PriceBracket[] = [
  { upTo: 2_500, price: 29 },
  { upTo: 5_000, price: 49 },
  ...linearBrackets(10_000, 50_000, 5_000, 69, 20),
];

/**
 * Movement ladder — $75 ≤5,000 · then +$40 per 5,000 up to 20,000 · then +$30 per 5,000 up to
 * 200,000 (40 brackets; piecewise step change at the 20,000-subscriber boundary).
 * Spot prices (qty = 1-based index): 1:$75 (5k) · 2:$115 (10k) · 3:$155 (15k) · 4:$195 (20k) ·
 * 5:$225 (25k) · 10:$375 (50k) · 20:$675 (100k) · 40:$1,275 (200k, tier max).
 */
const MOVEMENT_BRACKETS: readonly PriceBracket[] = [
  { upTo: 5_000, price: 75 },
  ...linearBrackets(10_000, 20_000, 5_000, 115, 40),
  ...linearBrackets(25_000, 200_000, 5_000, 225, 30),
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
      'Up to 50,000 email subscribers · 12× emails/month',
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
      'Scales smoothly from $75/month as your list grows',
      'Up to 200,000 email subscribers · 12× emails/month',
      'Unlimited staff seats & volunteers · 200 GB storage',
      'Canvassing & deliveries companion apps',
      'Yard signs & route optimization',
      'Turf cutting, walk lists & routes, field reports',
      'A/B testing & optional dedicated sending IP',
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
 * 'From $75' (movement), 'Custom' (enterprise). */
export function startingPriceLabel(plan: PlanDef): string {
  if (!plan.pricing) return 'Custom';
  const first = plan.pricing.brackets[0];
  if (!first) {
    // Unreachable: every non-null TierPricing in PLANS has at least one bracket.
    throw new Error(`unreachable: plan "${plan.key}" pricing has no brackets`);
  }
  return first.price === 0 ? '$0' : `From $${first.price}`;
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
        values: { free: 'Up to 1,000', grassroots: 'Up to 50,000', movement: 'Up to 200,000' },
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
        label: 'Support',
        values: { free: 'Community', grassroots: 'Email', movement: 'Priority + onboarding' },
      },
    ],
  },
];
