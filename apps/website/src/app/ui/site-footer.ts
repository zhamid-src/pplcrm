import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SiteLogo } from './site-logo';
import { SIGNUP_URL } from './site-nav';

interface FooterLink {
  readonly label: string;
  /** Internal router path. */
  readonly path?: string;
  /** External / mailto URL. */
  readonly href?: string;
  /** Query params (used with the /soon stub). */
  readonly qp?: Record<string, string>;
}

interface FooterColumn {
  readonly heading: string;
  readonly links: readonly FooterLink[];
}

const CONTACT_EMAIL = 'hello@pplcrm.com';

/**
 * Site footer — the one multi-column footer used on every page. Links to pages
 * that don't exist yet point at the /soon stub (carrying their label as the
 * heading).
 */
@Component({
  selector: 'pc-site-footer',
  imports: [RouterLink, SiteLogo],
  template: `
    <footer class="border-t border-line bg-base-100 px-5 pt-12 sm:px-8">
      <div class="site-wrap">
        <div class="grid grid-cols-2 gap-x-7 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          <div class="col-span-2 sm:col-span-3 lg:col-span-1">
            <pc-site-logo />
            <p class="mt-3 max-w-[200px] text-[12.5px] leading-relaxed text-base-content/50">
              One list for constituents, voters, donors and volunteers. Your people are not our product.
            </p>
            <a class="mt-3.5 block text-[12.5px] text-base-content/60 hover:text-primary" [href]="mailto">{{
              email
            }}</a>
          </div>

          @for (col of columns; track col.heading) {
            <div class="flex flex-col gap-2.5 text-[13px]">
              <div class="eyebrow mb-1">{{ col.heading }}</div>
              @for (link of col.links; track link.label) {
                @if (link.href) {
                  <a class="text-base-content/65 hover:text-primary" [href]="link.href">{{ link.label }}</a>
                } @else {
                  <a
                    class="text-base-content/65 hover:text-primary"
                    [routerLink]="link.path"
                    [queryParams]="link.qp ?? null"
                    >{{ link.label }}</a
                  >
                }
              }
            </div>
          }
        </div>

        <div
          class="mt-12 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line py-5 text-xs text-base-content/45"
        >
          <span>© 2026 pplCRM · pplcrm.com</span>
          <span
            >Your data is stored in Canada, or the region you choose on Movement. Export everything anytime. Delete
            means deleted.</span
          >
        </div>
      </div>
    </footer>
  `,
})
export class SiteFooter {
  protected readonly email = CONTACT_EMAIL;
  protected readonly mailto = `mailto:${CONTACT_EMAIL}`;

  protected readonly columns: readonly FooterColumn[] = [
    {
      heading: 'Product',
      links: [
        { label: 'Pricing', path: '/pricing' },
        { label: 'Compare', path: '/compare' },
        { label: 'FAQ', path: '/faq' },
        { label: 'Start free', href: SIGNUP_URL },
      ],
    },
    {
      heading: 'Industries',
      links: [
        { label: 'Constituency offices', path: '/for/offices' },
        { label: 'Campaigns', path: '/for/campaigns' },
        { label: 'Non-profits', path: '/for/nonprofits' },
      ],
    },
    {
      heading: 'Resources',
      links: [
        { label: 'Help center', path: '/docs' },
        { label: 'Support', href: `mailto:${CONTACT_EMAIL}` },
        { label: 'Data ownership', path: '/soon', qp: { pageTitle: 'Data ownership' } },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'About us', path: '/soon', qp: { pageTitle: 'About us' } },
        { label: 'Contact', href: `mailto:${CONTACT_EMAIL}` },
        { label: 'Careers', path: '/soon', qp: { pageTitle: 'Careers' } },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacy policy', path: '/soon', qp: { pageTitle: 'Privacy policy' } },
        { label: 'EULA', path: '/soon', qp: { pageTitle: 'EULA' } },
        { label: 'Security', path: '/soon', qp: { pageTitle: 'Security' } },
      ],
    },
  ];
}
