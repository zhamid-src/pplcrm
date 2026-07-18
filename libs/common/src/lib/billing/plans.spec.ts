import { describe, it, expect } from 'vitest';
import {
  bracketForQuantity,
  bracketIndexForSubscribers,
  emailCapForQuantity,
  getPlanDef,
  maxQuantity,
  planAllowsFeature,
  planDisplayName,
  priceForQuantity,
  priceLabelAt,
  subscriberCapForQuantity,
  GATED_FEATURES,
  PLANS_BY_KEY,
  PURCHASABLE_PLAN_KEYS,
  startingPriceLabel,
  startingPriceUsd,
} from './plans';

describe('bracketIndexForSubscribers', () => {
  it('free: boundaries at the tier max', () => {
    expect(bracketIndexForSubscribers('free', 0)).toBe(1);
    expect(bracketIndexForSubscribers('free', 1_000)).toBe(1);
    expect(bracketIndexForSubscribers('free', 1_001)).toBeNull();
  });

  it('grassroots: bracket boundaries including the tier max', () => {
    expect(bracketIndexForSubscribers('grassroots', 0)).toBe(1);
    expect(bracketIndexForSubscribers('grassroots', 1_000)).toBe(1);
    expect(bracketIndexForSubscribers('grassroots', 1_001)).toBe(2);
    expect(bracketIndexForSubscribers('grassroots', 2_500)).toBe(2);
    expect(bracketIndexForSubscribers('grassroots', 2_501)).toBe(3);
    expect(bracketIndexForSubscribers('grassroots', 25_000)).toBe(7);
    expect(bracketIndexForSubscribers('grassroots', 25_001)).toBe(8);
    expect(bracketIndexForSubscribers('grassroots', 100_000)).toBe(10);
    expect(bracketIndexForSubscribers('grassroots', 100_001)).toBeNull();
  });

  it('movement: bracket boundaries including the piecewise step change at 25,000', () => {
    expect(bracketIndexForSubscribers('movement', 1_000)).toBe(1);
    expect(bracketIndexForSubscribers('movement', 25_000)).toBe(7);
    expect(bracketIndexForSubscribers('movement', 25_001)).toBe(8);
    expect(bracketIndexForSubscribers('movement', 200_000)).toBe(11);
    expect(bracketIndexForSubscribers('movement', 200_001)).toBeNull();
  });

  it('enterprise: has no bracket ladder, always null', () => {
    expect(bracketIndexForSubscribers('enterprise', 100)).toBeNull();
  });
});

describe('priceForQuantity', () => {
  it('grassroots spot checks, including the piecewise step change', () => {
    expect(priceForQuantity('grassroots', 1)).toBe(29);
    expect(priceForQuantity('grassroots', 2)).toBe(49);
    expect(priceForQuantity('grassroots', 7)).toBe(149); // last +$20 bracket
    expect(priceForQuantity('grassroots', 8)).toBe(219); // first +$70 bracket
    expect(priceForQuantity('grassroots', 10)).toBe(359);
  });

  it('movement spot checks, including the piecewise step change', () => {
    expect(priceForQuantity('movement', 1)).toBe(55);
    expect(priceForQuantity('movement', 7)).toBe(265); // last +$35 bracket
    expect(priceForQuantity('movement', 8)).toBe(365); // first +$100 bracket
    expect(priceForQuantity('movement', 11)).toBe(665);
  });
});

describe('emailCapForQuantity', () => {
  it('is 12x the subscriber cap on paid tiers', () => {
    expect(emailCapForQuantity('grassroots', 1)).toBe(1_000 * 12);
    expect(emailCapForQuantity('movement', 6)).toBe(20_000 * 12);
  });

  it('is 2x the subscriber cap on free', () => {
    expect(emailCapForQuantity('free', 1)).toBe(1_000 * 2);
  });
});

describe('startingPriceLabel', () => {
  it('labels each displayed plan', () => {
    expect(startingPriceLabel(PLANS_BY_KEY.free)).toBe('$0');
    expect(startingPriceLabel(PLANS_BY_KEY.grassroots)).toBe('From $29');
    expect(startingPriceLabel(PLANS_BY_KEY.movement)).toBe('From $55');
    expect(startingPriceLabel(PLANS_BY_KEY.enterprise)).toBe('Custom');
  });
});

describe('priceLabelAt', () => {
  it('returns the live price within the ladder', () => {
    expect(priceLabelAt(PLANS_BY_KEY.grassroots, 10_000)).toBe('$89');
    expect(priceLabelAt(PLANS_BY_KEY.movement, 100_000)).toBe('$565');
  });

  it('returns "Contact us" past the tier max', () => {
    expect(priceLabelAt(PLANS_BY_KEY.grassroots, 100_001)).toBe('Contact us');
    expect(priceLabelAt(PLANS_BY_KEY.movement, 200_001)).toBe('Contact us');
  });

  it('returns "Custom" for enterprise regardless of count', () => {
    expect(priceLabelAt(PLANS_BY_KEY.enterprise, 5)).toBe('Custom');
  });
});

describe('getPlanDef legacy alias resolution', () => {
  it('resolves the retired representative key to movement, case-insensitively', () => {
    expect(getPlanDef('Representative')?.key).toBe('movement');
    expect(getPlanDef('representative')?.key).toBe('movement');
  });

  it('resolves the renamed starter key to free, case-insensitively', () => {
    expect(getPlanDef('starter')?.key).toBe('free');
    expect(getPlanDef('STARTER')?.key).toBe('free');
  });

  it('still resolves current keys directly', () => {
    expect(getPlanDef('movement')?.key).toBe('movement');
    expect(getPlanDef('grassroots')?.key).toBe('grassroots');
  });
});

describe('planAllowsFeature', () => {
  it('gates Grassroots-tier features off the free plan', () => {
    expect(planAllowsFeature('free', 'forms')).toBe(false);
    expect(planAllowsFeature('grassroots', 'forms')).toBe(true);
    expect(planAllowsFeature('movement', 'lists')).toBe(true);
  });

  it('gates Movement-only features off free and grassroots', () => {
    expect(planAllowsFeature('free', 'canvassing')).toBe(false);
    expect(planAllowsFeature('grassroots', 'deliveries')).toBe(false);
    expect(planAllowsFeature('movement', 'canvassing')).toBe(true);
    expect(planAllowsFeature('enterprise', 'deliveries')).toBe(true);
  });

  it('treats unknown/missing plan values as free (fail closed)', () => {
    expect(planAllowsFeature(null, 'forms')).toBe(false);
    expect(planAllowsFeature('mystery-tier', 'forms')).toBe(false);
  });

  it('resolves legacy aliases before gating', () => {
    expect(planAllowsFeature('representative', 'canvassing')).toBe(true); // retired key → movement
    expect(planAllowsFeature('starter', 'forms')).toBe(false); // renamed key → free
  });

  it('mirrors the FEATURE_MATRIX split for every gated feature', () => {
    for (const feature of Object.keys(GATED_FEATURES) as (keyof typeof GATED_FEATURES)[]) {
      const { minPlan } = GATED_FEATURES[feature];
      expect(planAllowsFeature(minPlan, feature)).toBe(true);
      expect(planAllowsFeature('free', feature)).toBe(false); // nothing gated is free-tier
    }
  });
});

describe('getPlanDef / planDisplayName edge cases', () => {
  it('returns undefined for missing or unknown plan values', () => {
    expect(getPlanDef(null)).toBeUndefined();
    expect(getPlanDef(undefined)).toBeUndefined();
    expect(getPlanDef('')).toBeUndefined();
    expect(getPlanDef('mystery-tier')).toBeUndefined();
  });

  it('planDisplayName uses the definition name, echoes unknown values, and defaults to Free', () => {
    expect(planDisplayName('grassroots')).toBe(PLANS_BY_KEY.grassroots.name);
    expect(planDisplayName('mystery-tier')).toBe('mystery-tier');
    expect(planDisplayName(null)).toBe('Free');
  });
});

describe('quantity ladder helpers', () => {
  it('maxQuantity equals the bracket count for laddered plans and Infinity for enterprise', () => {
    for (const key of PURCHASABLE_PLAN_KEYS) {
      const pricing = PLANS_BY_KEY[key].pricing;
      if (!pricing) throw new Error(`expected pricing for purchasable plan ${key}`);
      expect(maxQuantity(key)).toBe(pricing.brackets.length);
    }
    expect(maxQuantity('enterprise')).toBe(Infinity);
  });

  it('bracketForQuantity clamps out-of-range quantities into the ladder', () => {
    const pricing = PLANS_BY_KEY.grassroots.pricing;
    if (!pricing) throw new Error('expected grassroots pricing');
    const first = pricing.brackets[0];
    const last = pricing.brackets[pricing.brackets.length - 1];

    expect(bracketForQuantity('grassroots', 0)).toEqual(first);
    expect(bracketForQuantity('grassroots', -5)).toEqual(first);
    expect(bracketForQuantity('grassroots', pricing.brackets.length + 99)).toEqual(last);
  });

  it('bracketForQuantity throws for the ladderless enterprise plan', () => {
    expect(() => bracketForQuantity('enterprise', 1)).toThrow(/no pricing ladder/);
  });

  it('subscriberCapForQuantity matches the bracket upTo across every purchasable quantity', () => {
    for (const key of PURCHASABLE_PLAN_KEYS) {
      const pricing = PLANS_BY_KEY[key].pricing;
      if (!pricing) throw new Error(`expected pricing for ${key}`);
      pricing.brackets.forEach((bracket, i) => {
        expect(subscriberCapForQuantity(key, i + 1)).toBe(bracket.upTo);
        expect(priceForQuantity(key, i + 1)).toBe(bracket.price);
      });
    }
  });
});

describe('startingPriceUsd', () => {
  it('is 0 for free, the first bracket price for paid tiers, and null for enterprise', () => {
    expect(startingPriceUsd(PLANS_BY_KEY.free)).toBe(0);
    for (const key of PURCHASABLE_PLAN_KEYS) {
      const pricing = PLANS_BY_KEY[key].pricing;
      if (!pricing) throw new Error(`expected pricing for ${key}`);
      expect(startingPriceUsd(PLANS_BY_KEY[key])).toBe(pricing.brackets[0]?.price);
    }
    expect(startingPriceUsd(PLANS_BY_KEY.enterprise)).toBeNull();
  });

  it('agrees with startingPriceLabel for every plan', () => {
    for (const plan of Object.values(PLANS_BY_KEY)) {
      const usd = startingPriceUsd(plan);
      const label = startingPriceLabel(plan);
      if (usd === null) expect(label).toBe('Custom');
      else if (usd === 0) expect(label).toBe('$0');
      else expect(label).toBe(`From $${usd}`);
    }
  });
});
