import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FEATURE_MATRIX, PLANS, priceLabelAt } from '@common';
import type { FeatureMatrixGroup, FeatureMatrixRow, PlanDef } from '@common';

import { SiteFooter } from '../ui/site-footer';
import { SiteHeader } from '../ui/site-header';
import { SIGNUP_URL } from '../ui/site-nav';

/** Discrete emailable-subscriber counts the slider walks through (slider index = position here). */
const SLIDER_STOPS: readonly number[] = [1_000, 2_500, 5_000, 10_000, 15_000, 20_000, 25_000, 50_000, 100_000, 200_000];

/** Default slider position: 2,500 subscribers (Grassroots' first bracket). */
const DEFAULT_STOP_INDEX = 1;
const DEFAULT_STOP = 2_500;

/** The plan keys `FEATURE_MATRIX` carries values for (exactly the displayed plans). */
type MatrixPlanKey = keyof FeatureMatrixRow['values'];

function isMatrixPlanKey(key: string): key is MatrixPlanKey {
  return key === 'free' || key === 'grassroots' || key === 'movement';
}

@Component({
  selector: 'pc-pricing-page',
  imports: [RouterLink, SiteHeader, SiteFooter],
  templateUrl: './pricing-page.html',
})
export class PricingPage {
  protected readonly signupUrl = SIGNUP_URL;
  protected readonly mailto = 'mailto:hello@pplcrm.com';

  /** The priced comparison columns (Free / Grassroots / Movement); enterprise is a footnote. */
  protected readonly tiers: readonly PlanDef[] = PLANS.filter((plan) => plan.displayed);
  protected readonly matrix: readonly FeatureMatrixGroup[] = FEATURE_MATRIX;

  protected readonly maxStopIndex = SLIDER_STOPS.length - 1;
  protected readonly stopIndex = signal(DEFAULT_STOP_INDEX);
  protected readonly subscribers = computed<number>(() => SLIDER_STOPS[this.stopIndex()] ?? DEFAULT_STOP);
  protected readonly subscribersLabel = computed<string>(() => this.subscribers().toLocaleString('en-US'));

  protected onSlide(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.stopIndex.set(Number(target.value));
    }
  }

  /** Live price at the slider's subscriber count, with a thousands separator ($1,275). */
  protected priceLabel(plan: PlanDef): string {
    const label = priceLabelAt(plan, this.subscribers());
    const amount = /^\$(\d+)$/.exec(label)?.[1];
    return amount == null ? label : `$${Number(amount).toLocaleString('en-US')}`;
  }

  /** The slider sits past this tier's largest bracket (Free above 1,000; Grassroots above 50,000). */
  protected overMax(plan: PlanDef): boolean {
    return priceLabelAt(plan, this.subscribers()) === 'Contact us';
  }

  /** The tier's hard subscriber max, formatted (e.g. "50,000"). */
  protected maxSubscribersLabel(plan: PlanDef): string {
    const brackets = plan.pricing?.brackets;
    const last = brackets?.[brackets.length - 1];
    return (last?.upTo ?? 0).toLocaleString('en-US');
  }

  /** One matrix cell: true = included, false = not included, string = text value. */
  protected matrixValue(row: FeatureMatrixRow, plan: PlanDef): boolean | string {
    return isMatrixPlanKey(plan.key) ? row.values[plan.key] : false;
  }
}
