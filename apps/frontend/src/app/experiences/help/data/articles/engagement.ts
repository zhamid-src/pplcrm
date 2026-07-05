import type { HelpArticle } from '../help-types';

export const ENGAGEMENT_ARTICLES: HelpArticle[] = [
  {
    id: 'donations',
    category: 'engagement',
    title: 'Donations, pledges, and fundraising pages',
    summary:
      'Record gifts, track promised money separately from received money, and raise online with shareable pages.',
    keywords: ['donation', 'gift', 'pledge', 'fundraising', 'donate page', 'giving', 'contribution', 'donor'],
    related: ['person-profile', 'forms', 'export', 'grid-basics'],
    blocks: [
      { kind: 'h2', id: 'donations', text: 'Donations: money received' },
      {
        kind: 'p',
        text: 'The [Donations](/donations) grid is the ledger of received gifts. Each donation belongs to a person, so a donor’s full giving history is always one click away on their profile’s **Donations** tab. Like any grid, it filters, exports, and bulk-edits — see [Working in grids](/help/grid-basics).',
      },
      { kind: 'h2', id: 'pledges', text: 'Pledges: money promised' },
      {
        kind: 'p',
        text: 'Pledges live in their own view beside donations. Keeping promised and received money separate keeps reports honest — and gives you a follow-up queue of pledges yet to convert.',
      },
      { kind: 'h2', id: 'pages', text: 'Fundraising pages: money online' },
      {
        kind: 'steps',
        items: [
          {
            title: 'Open [Fundraising](/donation-pages) and click +',
            detail: 'Build the giving page — your appeal, your branding.',
          },
          { title: 'Share the link', detail: 'The page stands on its own for email, social, or QR codes.' },
          {
            title: 'Watch gifts arrive',
            detail: 'Donations made through the page land in the CRM attached to the right people — no retyping.',
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Thank fast',
        text: 'Gratitude is a retention strategy. Pair a page with an automation that thanks donors the moment a gift lands — see [Automations](/help/automations).',
      },
    ],
  },
  {
    id: 'events-shifts',
    category: 'engagement',
    title: 'Events and volunteer shifts',
    summary: 'Publish event pages people can register for, then staff the work with scheduled volunteer shifts.',
    keywords: ['event', 'shift', 'volunteer', 'schedule', 'signup', 'registration', 'attendance', 'rsvp'],
    related: ['teams', 'automations', 'forms', 'person-profile'],
    blocks: [
      {
        kind: 'p',
        text: 'Two tools cover the in-person world: **Events** are the occasions people attend; **Shifts** are the volunteer slots that make them run. They live side by side under Forms in the sidebar.',
      },
      { kind: 'h2', id: 'events', text: 'Events' },
      {
        kind: 'steps',
        items: [
          {
            title: 'Open [Events](/events/pages) and click +',
            detail: 'Set the what, when, and where, and publish the event page.',
          },
          { title: 'Share the page', detail: 'Registrations flow straight into the CRM as people sign up.' },
          {
            title: 'Review turnout',
            detail: 'Registrations and attendance appear on the event — and on each person’s **Events** tab.',
          },
        ],
      },
      { kind: 'h2', id: 'shifts', text: 'Volunteer shifts' },
      {
        kind: 'p',
        text: 'Create shifts under [Shifts](/events/shifts) with a time and a place. As volunteers sign up and serve, their hours accumulate on their profile’s **Volunteer** tab — which makes recognizing your most dedicated people easy.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Automate the follow-through',
        text: 'Attach an [automation](/help/automations) to an event to thank attendees or brief volunteers automatically — the trigger fires per signup.',
      },
    ],
  },
  {
    id: 'forms',
    category: 'engagement',
    title: 'Web forms',
    summary: 'Publish forms that feed the CRM directly — signups, surveys, and volunteer interest, no retyping.',
    keywords: ['form', 'web form', 'signup form', 'survey', 'embed', 'subscribe', 'submission'],
    related: ['newsletters', 'automations', 'import'],
    blocks: [
      {
        kind: 'p',
        text: 'Forms turn your audience’s interest into records. A form you build under [Forms](/forms) gets a public page you can share anywhere; submissions arrive as contacts and updates in real time, not as a spreadsheet to import on Friday.',
      },
      { kind: 'h2', id: 'build', text: 'Build and publish' },
      {
        kind: 'steps',
        items: [
          {
            title: 'Open [Forms](/forms) and click +',
            detail: 'Add the fields you actually need — short forms convert better.',
          },
          { title: 'Publish and share the link', detail: 'The form works as a standalone page.' },
          {
            title: 'Watch submissions arrive',
            detail: 'Each submission creates or updates a contact, ready to tag, list, and email.',
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Double opt-in and your forms',
        text: 'If your workspace enables double opt-in (**Workspace → Communications**), new web-form subscribers confirm by email before receiving newsletters — better list quality and compliance in one setting.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Tag at the source',
        text: 'Give each form a distinct tag for its signups and your segmentation stays effortless — you will always know who came from where. See [Tags and issues](/help/tags-issues).',
      },
    ],
  },
];
