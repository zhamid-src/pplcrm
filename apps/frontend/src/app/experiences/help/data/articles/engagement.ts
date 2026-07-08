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
    id: 'canvassing',
    category: 'engagement',
    title: 'Canvassing: turfs, the Companion, and the field report',
    summary:
      'Cut a smart list into walkable turfs, send them to volunteers on the Canvass Companion, and watch every knock sync back live.',
    keywords: ['canvass', 'canvassing', 'turf', 'door', 'knock', 'walk', 'field', 'companion', 'volunteer', 'gotv'],
    related: ['teams', 'lists', 'events-shifts'],
    blocks: [
      {
        kind: 'p',
        text: 'Open [Canvassing](/canvassing) under **Field** in the sidebar. The header sentence sums up the whole operation at a glance — how many turfs exist, how many are in the field now, how many doors have been attempted, and how many turfs are still waiting for a canvasser.',
      },
      { kind: 'h2', id: 'cut', text: 'Cut turfs from a list' },
      {
        kind: 'steps',
        items: [
          {
            title: 'Click **Cut new turfs**',
            detail: 'Pick a universe — any [smart list](/lists) of the people (or households) you want knocked.',
          },
          {
            title: 'Choose doors per turf',
            detail:
              '30 for a short shift, 40 recommended, 50 for experienced canvassers, 60 for pairs. The preview does the math in the open and estimates the walk time.',
          },
          {
            title: 'Confirm',
            detail:
              'Turfs are cut from your located households into contiguous, walkable groups that never cross a hard barrier like a highway, rail line, or river. New turfs land as Draft — unassigned.',
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Only located doors get cut',
        text: 'A turf is built from households the app has geocoded. Addresses still being located are reported in the preview and join a turf once they resolve — nothing is silently dropped.',
      },
      { kind: 'h2', id: 'assign', text: 'Assign turfs to volunteers' },
      {
        kind: 'p',
        text: 'Assigning a turf sends it to every member of its [team](/teams)’s Canvass Companion — a web app, so there is nothing to install. Prefer walk-up volunteers? **Copy app link** hands out the same turf to anyone who opens it, no account required. Keep a turf in sync with its list any time with **Refresh from list** — it pulls in new matching doors without ever losing knock history.',
      },
      { kind: 'h2', id: 'companion', text: 'The Canvass Companion' },
      {
        kind: 'p',
        text: 'Volunteers open their link, add their name, and walk the door list. For each door they log an outcome — talked, no answer, not home, refused — and when they talk to someone, how that person leaned. Every knock syncs live to the person, the household, the turf’s progress, and the Activity log, attributed honestly as “via Canvass Companion”. No signal? Knocks queue on the phone and upload automatically when the volunteer is back online.',
      },
      { kind: 'h2', id: 'report', text: 'The field report' },
      {
        kind: 'p',
        text: 'The **Field report** tab turns those knocks into the picture of the operation: doors, conversations, contact rate and support IDs; what voters said at the door; doors knocked per day; performance by team; when doors answer best; and your top canvassers. Change the range or **Export CSV** for the raw numbers by team and by day. Every figure flows in from synced Companions — nothing is entered by hand.',
      },
    ],
  },
];
