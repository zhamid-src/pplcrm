import { Component } from '@angular/core';

import { SiteFooter } from '../ui/site-footer';
import { SiteHeader } from '../ui/site-header';
import { SIGNUP_URL } from '../ui/site-nav';

interface Qa {
  readonly q: string;
  readonly a: string;
}

interface Group {
  readonly label: string;
  readonly items: readonly Qa[];
}

@Component({
  selector: 'pc-faq-page',
  imports: [SiteHeader, SiteFooter],
  templateUrl: './faq-page.html',
})
export class FaqPage {
  protected readonly signupUrl = SIGNUP_URL;
  protected readonly mailto = 'mailto:hello@pplcrm.com';

  protected readonly groups: readonly Group[] = [
    {
      label: 'Getting started',
      items: [
        {
          q: 'Is the free plan really free?',
          a: 'Yes. No card and no time limit. The demo workspace and up to 500 of your own people stay free for as long as you want them.',
        },
        {
          q: 'What is the Riverton demo?',
          a: 'A complete sample workspace for a fictional local campaign: 5,012 people, 1,890 households, 611 donors, a live inbox and cut turfs. It exists so you can try every feature, including the destructive ones, without touching real data.',
        },
        {
          q: 'Do I need training to get started?',
          a: 'Most teams are triaging real cases their first morning. Buttons say what they do in plain language, and anything disabled tells you exactly what it’s waiting for.',
        },
        {
          q: 'How do I move from the demo to real work?',
          a: 'Import your spreadsheet. Duplicates merge automatically on the way in, and the sample data steps aside.',
        },
      ],
    },
    {
      label: 'Your data',
      items: [
        {
          q: 'Who owns the data?',
          a: 'You do. We never sell, share or rent it. Your donors and constituents are not our product.',
        },
        {
          q: 'Can I get my data back out?',
          a: 'Always. People, notes, donations and history export to plain CSV whenever you want, on every plan.',
        },
        {
          q: 'Is my workspace shared with other organizations?',
          a: 'No. Each organization runs in its own isolated workspace.',
        },
        {
          q: 'Where is my data stored?',
          a: 'In your region. Canadian organizations’ data stays in Canada, EU organizations’ data stays in the EU, and so on. It doesn’t cross borders for processing or backups.',
        },
        {
          q: 'What happens when I delete something?',
          a: 'Delete means deleted. Records are purged, not quietly archived for us to keep.',
        },
      ],
    },
    {
      label: 'Field apps',
      items: [
        {
          q: 'What do volunteers see?',
          a: 'Only what you hand them: the turf they’re walking or the route they’re driving, on iOS, Android or the web. Not the whole list.',
        },
        {
          q: 'Do the apps work offline?',
          a: 'Yes. Door lists and routes are offline-first, and knocks sync back to the field report when you’re in signal again.',
        },
        {
          q: 'Do field volunteers need their own seats?',
          a: 'In the sample tiers, no. Volunteers join by invite to use the companion apps and don’t take up a staff seat.',
        },
      ],
    },
    {
      label: 'Pricing',
      items: [
        {
          q: 'Why is the pricing marked “sample”?',
          a: 'We’re still settling the pricing model. The tiers on the pricing page show the shape of it; the numbers are placeholders.',
        },
        {
          q: 'Will I be charged when final pricing lands?',
          a: 'Not without saying yes. We’ll tell you before anything changes, and free workspaces stay free.',
        },
        {
          q: 'Can I talk to a human before committing?',
          a: 'Yes. Book a 15-minute walkthrough and we’ll set up the demo together, or write to hello@pplcrm.com.',
        },
      ],
    },
  ];
}
