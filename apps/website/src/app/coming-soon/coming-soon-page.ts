import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SiteFooter } from '../ui/site-footer';
import { SiteHeader } from '../ui/site-header';
import { SIGNUP_URL } from '../ui/site-nav';

/**
 * Shared placeholder for pages the design links to but we haven't built yet
 * (assorted footer links). `pageTitle` is
 * bound from the route's `data` or a `?pageTitle=` query param via
 * withComponentInputBinding — swap the route to a real component when it exists.
 */
@Component({
  selector: 'pc-coming-soon-page',
  imports: [RouterLink, SiteHeader, SiteFooter],
  template: `
    <pc-site-header variant="solid" />

    <section class="flex min-h-[62vh] items-center justify-center px-5 py-20 text-center sm:px-8">
      <div class="mx-auto max-w-[520px]">
        <div class="eyebrow">{{ pageTitle() }}</div>
        <h1 class="mt-3 text-[clamp(1.75rem,5vw,2.25rem)] font-bold tracking-[-0.02em]">This page is on the way.</h1>
        <p class="mx-auto mt-3.5 max-w-[420px] text-[15px] leading-relaxed text-base-content/60">
          We’re still writing this one. In the meantime you can try the whole product on sample data — no card, nothing
          to lose.
        </p>
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a [href]="signupUrl" class="btn btn-primary rounded-field px-6 font-semibold">Start free with sample data</a>
          <a routerLink="/" class="btn btn-ghost rounded-field font-semibold">Back to home</a>
        </div>
      </div>
    </section>

    <pc-site-footer />
  `,
})
export class ComingSoonPage {
  public readonly pageTitle = input<string>('Coming soon');
  protected readonly signupUrl = SIGNUP_URL;
}
