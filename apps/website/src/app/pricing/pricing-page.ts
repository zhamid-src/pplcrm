import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { bracketIndexForSubscribers, FEATURE_MATRIX, PLANS, priceForQuantity } from '@common';
import type { FeatureMatrixGroup, FeatureMatrixRow, PlanDef } from '@common';

import { CurrencyService } from '../ui/currency.service';
import { SiteFooter } from '../ui/site-footer';
import { SiteHeader } from '../ui/site-header';
import { SIGNUP_URL } from '../ui/site-nav';

/** Discrete emailable-subscriber counts the slider walks through (slider index = position here). */
const SLIDER_STOPS: readonly number[] = [
  1_000, 2_500, 5_000, 10_000, 15_000, 20_000, 25_000, 50_000, 75_000, 100_000, 200_000,
];

/** Default slider position: 2,500 subscribers (the first count past the Free tier's 1,000 cap). */
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

  private readonly currency = inject(CurrencyService);
  /** Whether prices are being shown in a non-USD currency (gates the billing disclaimer). */
  protected readonly isConverted = this.currency.isConverted;
  /** The active display currency's price symbol (e.g. `C$`), for the disclaimer copy. */
  protected readonly currencySymbol = this.currency.priceSymbol;

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

  /** Live price at the slider's subscriber count, formatted in the active display currency. */
  protected priceLabel(plan: PlanDef): string {
    const index = bracketIndexForSubscribers(plan.key, this.subscribers());
    if (index === null) return 'Contact us';
    return this.currency.format(priceForQuantity(plan.key, index));
  }

  /** The Free tier's $0, formatted in the active currency (shown when the slider sits above 1,000). */
  protected zeroPrice(): string {
    return this.currency.format(0);
  }

  /** The slider sits past this tier's largest bracket (Free above 1,000; Grassroots above 100,000). */
  protected overMax(plan: PlanDef): boolean {
    return bracketIndexForSubscribers(plan.key, this.subscribers()) === null;
  }

  /** The tier's hard subscriber max, formatted (e.g. "100,000"). */
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
