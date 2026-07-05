import type { HelpArticle } from '../help-types';

export const OUTREACH_ARTICLES: HelpArticle[] = [
  {
    id: 'newsletters',
    category: 'outreach',
    title: 'Create and send a newsletter',
    summary:
      'Template to audience to send: the full path, plus scheduling, the compliance footer, and how sending progress is shown.',
    keywords: ['newsletter', 'campaign', 'email blast', 'send', 'schedule', 'template', 'audience', 'unsubscribe'],
    related: ['lists', 'tags-issues', 'settings', 'automations'],
    blocks: [
      { kind: 'h2', id: 'compose', text: 'From template to draft' },
      {
        kind: 'steps',
        items: [
          { title: 'Open [Newsletters](/newsletters) and click +', detail: 'Start from a template or a blank canvas.' },
          {
            title: 'Design in the visual editor',
            detail: 'Write and arrange your content visually — what you see is what subscribers get.',
          },
          {
            title: 'Name it clearly',
            detail: 'The name is how you will find it in the grid and its performance later.',
          },
        ],
      },
      { kind: 'h2', id: 'audience', text: 'Choose the audience' },
      {
        kind: 'p',
        text: 'Audiences are built from your [lists](/help/lists) and refined with tags — include the tags you want, exclude the ones you do not (exclude always wins). The estimated recipient count updates as you adjust, so you know the reach **before** you send, not after.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Dynamic lists shine here',
        text: 'An audience built on a dynamic list is evaluated fresh — whoever matches on send day gets the email. No stale rosters.',
      },
      { kind: 'h2', id: 'send', text: 'Send or schedule' },
      {
        kind: 'p',
        text: 'Send now, or set a send date to schedule. While a send is running, a progress indicator appears in the top bar — you can keep working anywhere in the app; sending happens in the background.',
      },
      {
        kind: 'p',
        text: 'After the send, the newsletter’s page tracks how it performed, and each recipient’s profile lists it under their **Newsletters** tab.',
      },
      { kind: 'h2', id: 'compliance', text: 'The footer and opt-in rules' },
      {
        kind: 'list',
        items: [
          'Every newsletter carries your footer disclaimer and an unsubscribe link. Administrators set the disclaimer text under **Workspace → Communications**.',
          'The default from-name and from-address also live there — only verified sender addresses can be used, which protects your deliverability.',
          'With **double opt-in** enabled, people who subscribe through a web form must confirm by email before they receive newsletters.',
        ],
      },
      {
        kind: 'callout',
        tone: 'warning',
        title: 'Respect unsubscribes',
        text: 'Unsubscribed people are excluded automatically. Do not re-import or re-tag your way around it — it damages trust and your sender reputation.',
      },
    ],
  },
  {
    id: 'inbox',
    category: 'outreach',
    title: 'The shared inbox',
    summary:
      'Read and answer your organization’s email inside PeopleCRM, with every conversation attached to the right person.',
    keywords: ['inbox', 'email', 'reply', 'conversation', 'response time', 'sla email', 'correspondence', 'gmail keys'],
    related: ['dashboard', 'person-profile', 'shortcuts', 'settings'],
    blocks: [
      {
        kind: 'p',
        text: 'The [Inbox](/inbox) is a full email client inside the CRM. The difference from a personal mailbox: conversations connect to contact records, so an exchange with a supporter shows up on their profile’s **Emails** tab — context nobody has to forward around.',
      },
      { kind: 'h2', id: 'workflow', text: 'A healthy inbox rhythm' },
      {
        kind: 'list',
        items: [
          'Answer oldest first — response-time targets (SLAs) are measured per email, and the [Dashboard](/summary) rolls breaches up into a status.',
          'While replies are sending, the top bar shows a sending indicator with a count; you can navigate away freely.',
          'Notifications alert you to activity that needs you — tune them on your [Profile](/profile).',
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Work it like Gmail',
        text: 'The inbox answers to Gmail-style keys — `c` compose, `r` reply, `e` mark done, `s` star, `j`/`k` next and previous, `#` delete, and more. The full table is in [Keyboard shortcuts](/help/shortcuts), or press `?` right in the inbox.',
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Where the response target comes from',
        text: 'Administrators set the email SLA in working hours (plus the working days and business hours that count) under **Workspace → SLA Configuration** — see [The dashboard and SLA health](/help/dashboard).',
      },
    ],
  },
  {
    id: 'automations',
    category: 'outreach',
    title: 'Automations',
    summary:
      'Build multi-step workflows that run on their own — triggered manually or by things that happen, like an event signup.',
    keywords: ['automation', 'workflow', 'trigger', 'steps', 'follow up', 'drip', 'automatic'],
    related: ['newsletters', 'events-shifts', 'tasks'],
    blocks: [
      {
        kind: 'p',
        text: 'Automations (under [Automations](/workflows) in the sidebar) do the repetitive follow-through for you: the welcome sequence for new subscribers, the thank-you after an event, the reminder before a shift.',
      },
      { kind: 'h2', id: 'anatomy', text: 'Anatomy of a workflow' },
      {
        kind: 'list',
        items: [
          '**Trigger** — what starts a run: fire it manually, or attach it to an event so signups kick it off automatically.',
          '**Steps** — what happens, in order. Select any step on the canvas to configure it.',
          '**Settings** — the workflow’s name and behavior.',
        ],
      },
      { kind: 'h2', id: 'first', text: 'A good first automation' },
      {
        kind: 'steps',
        items: [
          {
            title: 'Open [Automations](/workflows) and click +',
            detail: 'Give it a name that says what it does — “Event signup thank-you”.',
          },
          { title: 'Pick the trigger', detail: 'Choose the event that should start it.' },
          {
            title: 'Add the steps',
            detail: 'Keep the first version to one or two steps; add sophistication after it has run a few times.',
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Start manual, then automate',
        text: 'Running a workflow manually a few times is the fastest way to trust it — once the steps behave, wire it to the trigger and let it run.',
      },
    ],
  },
];
