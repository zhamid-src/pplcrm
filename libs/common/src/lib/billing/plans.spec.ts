import { describe, it, expect } from 'vitest';
import {
  bracketIndexForSubscribers,
  emailCapForQuantity,
  getPlanDef,
  planAllowsFeature,
  priceForQuantity,
  priceLabelAt,
  GATED_FEATURES,
  PLANS_BY_KEY,
  startingPriceLabel,
} from './plans';

describe('bracketIndexForSubscribers', () => {
  it('free: boundaries at the tier max', () => {
    expect(bracketIndexForSubscribers('free', 0)).toBe(1);
    expect(bracketIndexForSubscribers('free', 1_000)).toBe(1);
    expect(bracketIndexForSubscribers('free', 1_001)).toBeNull();
  });

  it('grassroots: bracket boundaries including the tier max', () => {
    expect(bracketIndexForSubscribers('grassroots', 0)).toBe(1);
    expect(bracketIndexForSubscribers('grassroots', 2_500)).toBe(1);
    expect(bracketIndexForSubscribers('grassroots', 2_501)).toBe(2);
    expect(bracketIndexForSubscribers('grassroots', 5_000)).toBe(2);
    expect(bracketIndexForSubscribers('grassroots', 5_001)).toBe(3);
    expect(bracketIndexForSubscribers('grassroots', 50_000)).toBe(11);
    expect(bracketIndexForSubscribers('grassroots', 50_001)).toBeNull();
  });

  it('movement: bracket boundaries including the piecewise step change at 20,000', () => {
    expect(bracketIndexForSubscribers('movement', 5_000)).toBe(1);
    expect(bracketIndexForSubscribers('movement', 20_000)).toBe(4);
    expect(bracketIndexForSubscribers('movement', 20_001)).toBe(5);
    expect(bracketIndexForSubscribers('movement', 200_000)).toBe(40);
    expect(bracketIndexForSubscribers('movement', 200_001)).toBeNull();
  });

  it('enterprise: has no bracket ladder, always null', () => {
    expect(bracketIndexForSubscribers('enterprise', 100)).toBeNull();
  });
});

describe('priceForQuantity', () => {
  it('grassroots spot checks', () => {
    expect(priceForQuantity('grassroots', 2)).toBe(49);
    expect(priceForQuantity('grassroots', 11)).toBe(229);
  });

  it('movement spot checks, including the piecewise step change', () => {
    expect(priceForQuantity('movement', 4)).toBe(195);
    expect(priceForQuantity('movement', 5)).toBe(225);
    expect(priceForQuantity('movement', 10)).toBe(375);
    expect(priceForQuantity('movement', 20)).toBe(675);
    expect(priceForQuantity('movement', 40)).toBe(1_275);
  });
});

describe('emailCapForQuantity', () => {
  it('is 12x the subscriber cap on paid tiers', () => {
    expect(emailCapForQuantity('grassroots', 1)).toBe(2_500 * 12);
    expect(emailCapForQuantity('movement', 4)).toBe(20_000 * 12);
  });

  it('is 2x the subscriber cap on free', () => {
    expect(emailCapForQuantity('free', 1)).toBe(1_000 * 2);
  });
});

describe('startingPriceLabel', () => {
  it('labels each displayed plan', () => {
    expect(startingPriceLabel(PLANS_BY_KEY.free)).toBe('$0');
    expect(startingPriceLabel(PLANS_BY_KEY.grassroots)).toBe('From $29');
    expect(startingPriceLabel(PLANS_BY_KEY.movement)).toBe('From $75');
    expect(startingPriceLabel(PLANS_BY_KEY.enterprise)).toBe('Custom');
  });
});

describe('priceLabelAt', () => {
  it('returns the live price within the ladder', () => {
    expect(priceLabelAt(PLANS_BY_KEY.grassroots, 10_000)).toBe('$69');
    expect(priceLabelAt(PLANS_BY_KEY.movement, 100_000)).toBe('$675');
  });

  it('returns "Contact us" past the tier max', () => {
    expect(priceLabelAt(PLANS_BY_KEY.grassroots, 50_001)).toBe('Contact us');
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
