import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SiteFooter } from '../ui/site-footer';
import { SiteHeader } from '../ui/site-header';
import { SIGNUP_URL } from '../ui/site-nav';

interface Tier {
  readonly name: string;
  readonly price: string;
  readonly cadence: string;
  readonly blurb: string;
  readonly featured: boolean;
  readonly features: readonly string[];
  readonly ctaLabel: string;
  readonly ctaHref: string;
}

@Component({
  selector: 'pc-pricing-page',
  imports: [RouterLink, SiteHeader, SiteFooter],
  templateUrl: './pricing-page.html',
})
export class PricingPage {
  protected readonly signupUrl = SIGNUP_URL;
  protected readonly mailto = 'mailto:hello@pplcrm.com';

  protected readonly tiers: readonly Tier[] = [
    {
      name: 'Starter',
      price: '$0',
      cadence: 'forever',
      blurb: 'For getting your bearings and running a small list.',
      featured: false,
      features: [
        'The Riverton demo workspace',
        'Import up to 500 of your own people',
        '2 staff seats',
        'CSV import & export',
        'Companion apps for volunteers',
        'Email support',
      ],
      ctaLabel: 'Start free',
      ctaHref: SIGNUP_URL,
    },
    {
      name: 'Team',
      price: '$49',
      cadence: 'per month · sample figure',
      blurb: 'For an office or campaign running the whole playbook.',
      featured: true,
      features: [
        'Everything in Starter',
        'Unlimited people & households',
        'Newsletters & segments',
        'Canvassing, turf cutting & field reports',
        'Donations, yard signs & deliveries',
        '10 staff seats · unlimited volunteers',
        'Priority support',
      ],
      ctaLabel: 'Start free',
      ctaHref: SIGNUP_URL,
    },
    {
      name: 'Organization',
      price: 'Let’s talk',
      cadence: 'multi-office & federations',
      blurb: 'For federations and multi-office operations.',
      featured: false,
      features: [
        'Everything in Team',
        'Multiple linked workspaces',
        'Single sign-on (SSO)',
        'Data residency by region',
        'Unlimited staff seats',
        'Guided onboarding',
      ],
      ctaLabel: 'Contact us',
      ctaHref: 'mailto:hello@pplcrm.com',
    },
  ];
}
