import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SiteFooter } from '../ui/site-footer';
import { SiteHeader } from '../ui/site-header';
import { SiteIcon } from '../ui/site-icon';
import { SIGNUP_URL } from '../ui/site-nav';

interface Promise_ {
  readonly body: string;
  readonly icon: string;
  readonly title: string;
}

/**
 * Data ownership: the plain-language version of the footer's promise ("Your
 * people are not our product") with the concrete commitments behind it.
 * Every claim here must stay consistent with the FAQ, the privacy policy and
 * the EULA; when one changes, check the others.
 */
@Component({
  selector: 'pc-data-ownership-page',
  imports: [RouterLink, SiteHeader, SiteFooter, SiteIcon],
  templateUrl: './data-ownership-page.html',
})
export class DataOwnershipPage {
  protected readonly signupUrl = SIGNUP_URL;
  protected readonly mailto = 'mailto:hello@pplcrm.com';

  protected readonly promises: readonly Promise_[] = [
    {
      icon: 'lock-closed',
      title: 'We never sell, share or rent your list',
      body: 'Not to advertisers, not to data brokers, not to other campaigns or causes. Our revenue is subscriptions, so we work for you, not for whoever would pay for your donors.',
    },
    {
      icon: 'arrow-down-tray',
      title: 'Everything exports, on every plan',
      body: 'People, households, notes, tags, donations and history export to plain CSV whenever you want. No export tax, no “contact sales”, no waiting period.',
    },
    {
      icon: 'trash-forever',
      title: 'Delete means deleted',
      body: 'When you delete a record or close your workspace, it is purged from the live database, not quietly archived for us to keep. Backup copies expire automatically within days.',
    },
    {
      icon: 'globe-americas',
      title: 'Hosted in Canada',
      body: 'Your workspace is stored in Canada, and your data stays there for processing and backups.',
    },
    {
      icon: 'user-group',
      title: 'One organization per workspace',
      body: 'Your workspace is isolated from every other organization on the platform, and every query in the product is scoped to your workspace by design. Nobody else can see your people, and you never see theirs.',
    },
    {
      icon: 'envelope',
      title: 'Your sending reputation is yours',
      body: 'Newsletters go out from your own verified domain, so the trust you build with inbox providers belongs to you. If you ever leave, your reputation leaves with you.',
    },
  ];
}
