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
        text: 'Two tools cover the in-person world: **Events** are the occasions people attend; **Shifts** are the volunteer slots that make them run. They live side by side under Field in the sidebar.',
      },
      { kind: 'h2', id: 'events', text: 'Events' },
      {
        kind: 'steps',
        items: [
          {
            title: 'Open [Events](/events/pages) and click +',
            detail: 'Set the what, when, and where, and publish the event page.',
          },
          {
            title: 'Share the page',
            detail:
              'Every event gets a public link on your organization’s own web address — copy it from the event’s **Public link** panel. Registrations flow straight into the CRM as people sign up.',
          },
          {
            title: 'Review turnout',
            detail: 'Registrations and attendance appear on the event — and on each person’s **Events** tab.',
          },
        ],
      },
      { kind: 'h2', id: 'shifts', text: 'Volunteer shifts' },
      {
        kind: 'p',
        text: 'Create shifts under [Shifts](/events/shifts) with a time and a place. Each shift has its own public signup link, and your organization also gets a public **Volunteer events** page listing every upcoming public shift — the link is on the shift’s edit page. As volunteers sign up and serve, their hours accumulate on their profile’s **Volunteer** tab — which makes recognizing your most dedicated people easy.',
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
    summary:
      'Signups, RSVPs, pledges and surveys as living pages: draft → publish → archive, edited live beside a preview, with responses that are people.',
    keywords: [
      'form',
      'web form',
      'signup form',
      'survey',
      'rsvp',
      'pledge',
      'embed',
      'subscribe',
      'submission',
      'publish',
      'archive',
      'responses',
    ],
    related: ['newsletters', 'automations', 'import', 'tags-issues'],
    blocks: [
      {
        kind: 'p',
        text: 'A form under [Forms](/forms) is a living page with a lifecycle — **draft**, **published**, **archived**. You pick a type when you create it (Signup, Pledge, RSVP, Request, Survey), edit it live beside a preview, and share one public link. Every response creates or updates a person, so submissions arrive as records — never a spreadsheet to import on Friday.',
      },
      { kind: 'h2', id: 'create', text: 'Create from a template' },
      {
        kind: 'steps',
        items: [
          {
            title: 'Open [Forms](/forms) and click New form',
            detail: 'Name it and pick a starting template — it opens as a draft in edit mode.',
          },
          {
            title: 'Turn fields on and set what’s required',
            detail:
              'Check a field to add it; click its Optional/Required pill to toggle. Changes apply to the live form instantly — there is nothing to save.',
          },
          {
            title: 'Publish when it’s ready',
            detail:
              'Publish activates the public link and the form starts accepting responses. Unpublish pauses it; the link keeps working again the moment you republish.',
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Email is the identity key',
        text: 'Every form always collects an email, always required — it’s how each response is matched to (or creates) a person. That’s why the email field can’t be turned off or made optional.',
      },
      { kind: 'h2', id: 'responses', text: 'Responses are people' },
      {
        kind: 'p',
        text: 'The **Responses** tab lists each submission and links straight to the person it created or updated. Every response also applies the form’s tags — including an automatic `Source: <form name>` tag — and joins the lists you chose under **Audience**, so your segmentation stays effortless. Export the responses to CSV anytime.',
      },
      { kind: 'h2', id: 'share', text: 'Share and embed' },
      {
        kind: 'list',
        items: [
          'Copy the public link or open the standalone page from the link row.',
          'Use the `</>` embed to drop the form into any site — an auto-updating iframe, or a raw HTML form that reflects your currently enabled fields.',
          'Turn on a confirmation email to thank people automatically, or notify your team when a response lands (both under **After submit**).',
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Archive, don’t delete',
        text: 'A form with responses can be archived — its public link shows a friendly closed notice and every record keeps pointing at it. Restore brings it back as a draft. Only an untouched draft with zero responses can be deleted outright.',
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Double opt-in and your forms',
        text: 'If your workspace enables double opt-in (**Workspace → Communications**), new subscribers confirm by email before receiving newsletters — better list quality and compliance in one setting.',
      },
    ],
  },
  {
    id: 'deliveries',
    category: 'engagement',
    title: 'Yard-sign deliveries and volunteer routes',
    summary:
      'Collect yard-sign requests, turn approved ones into about-an-hour driving routes, and hand each route to a volunteer through a private link — no volunteer account needed.',
    keywords: ['yard sign', 'delivery', 'route', 'volunteer', 'sign', 'drive', 'stops', 'plan routes', 'canvass drop'],
    related: ['events-shifts', 'teams', 'forms', 'households'],
    blocks: [
      {
        kind: 'p',
        text: 'Deliveries turns yard-sign requests into optimized driving routes and hands each one to a volunteer. Open [Deliveries](/deliveries) under **Field** in the sidebar — the badge shows how many requests are approved and ready to route.',
      },
      { kind: 'h2', id: 'requests', text: 'Requests: approve what comes in' },
      {
        kind: 'p',
        text: 'Every request is tied to a household, so its map location comes from the household’s address. The **Readiness** chip tells you the geocode state — **Located**, **Locating…**, or **Address problem** — and a request must be approved and located to be routed. Select rows and use **Approve** or **Decline** in the selection bar; the count is repeated on every button.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Address problem?',
        text: 'A request that can’t be located shows an **Edit household** link right on the row. Fixing the address there re-triggers geocoding automatically — the request becomes routable on its own.',
      },
      { kind: 'h2', id: 'plan', text: 'Plan routes (preview first)' },
      {
        kind: 'steps',
        items: [
          {
            title: 'Click Plan routes · N ready',
            detail: 'Set the start address drivers leave from. It’s remembered for next time.',
          },
          {
            title: 'Preview routes',
            detail:
              'Preview is a pure calculation — it doesn’t save anything. You’ll see proposed routes, per-stop travel times, and an honest explanation of anything that couldn’t fit.',
          },
          {
            title: 'Create N routes',
            detail: 'Only now is anything saved. All the routes are created together and you land on the routes list.',
          },
        ],
      },
      { kind: 'h2', id: 'assign', text: 'Assign and share' },
      {
        kind: 'p',
        text: 'On a route, **Copy volunteer link** mints a private link valid for 30 days and copies it to your clipboard — paste it wherever you talk to your volunteer. **Open in Google Maps** launches turn-by-turn for the whole route. Reordering stops recomputes the estimate for you. Revoke or regenerate the link any time from the ⋯ menu.',
      },
      { kind: 'h2', id: 'deliver', text: 'Volunteers deliver' },
      {
        kind: 'p',
        text: 'The volunteer opens the link on their phone and works one stop at a time: **Mark delivered**, **Couldn’t deliver** (with a reason), or **Skip for now** (moves the house to the end). The page shows first name and address only — never a constituent’s email or phone. Undo is always there for the last action. A house reported undeliverable returns to your planning pool automatically, and when every stop is handled the route finishes itself.',
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'One source of truth',
        text: 'A request is “on a route” only while it has an active stop — there’s no separate flag to fall out of sync. Skip or remove a stop and the request is instantly back in the pool for the next batch.',
      },
    ],
  },
];
