import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PLANS } from '@common';
import type { PlanDef } from '@common';

import { SiteFooter } from '../ui/site-footer';
import { SiteHeader } from '../ui/site-header';
import { SIGNUP_URL } from '../ui/site-nav';

@Component({
  selector: 'pc-pricing-page',
  imports: [RouterLink, SiteHeader, SiteFooter],
  templateUrl: './pricing-page.html',
})
export class PricingPage {
  protected readonly signupUrl = SIGNUP_URL;
  protected readonly mailto = 'mailto:hello@pplcrm.com';

  protected readonly tiers: readonly PlanDef[] = PLANS;

  /** Enterprise is contact-sales; every other tier starts on the free workspace. */
  protected isContactSales(plan: PlanDef): boolean {
    return plan.purchasable === false && plan.key === 'enterprise';
  }

  protected ctaLabel(plan: PlanDef): string {
    return this.isContactSales(plan) ? 'Contact us' : 'Start free';
  }

  protected ctaHref(plan: PlanDef): string {
    return this.isContactSales(plan) ? this.mailto : this.signupUrl;
  }
}
