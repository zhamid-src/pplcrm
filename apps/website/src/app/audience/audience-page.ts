import { Component, input } from '@angular/core';

import { AppPreview } from '../ui/app-preview';
import { BrowserFrame } from '../ui/browser-frame';
import { SiteFooter } from '../ui/site-footer';
import { SiteHeader } from '../ui/site-header';
import { SiteIcon } from '../ui/site-icon';
import { SIGNUP_URL } from '../ui/site-nav';
import type { AudiencePageConfig } from './audience-content';

/**
 * One template for the three audience landing pages (offices / campaigns /
 * non-profits). The `config` input is bound from the route's `data` via
 * withComponentInputBinding — see app.routes.ts.
 */
@Component({
  selector: 'pc-audience-page',
  imports: [SiteHeader, SiteFooter, BrowserFrame, AppPreview, SiteIcon],
  templateUrl: './audience-page.html',
})
export class AudiencePage {
  public readonly config = input.required<AudiencePageConfig>();
  protected readonly signupUrl = SIGNUP_URL;
}
