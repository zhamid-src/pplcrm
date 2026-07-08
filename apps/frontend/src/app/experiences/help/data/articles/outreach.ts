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
        text: 'The [Inbox](/inbox) is a full email client inside the CRM. The difference from a personal mailbox: conversations connect to contact records, so an exchange with a supporter shows up on their profile’s **Emails** tab — context nobody has to forward around. When you open a conversation, a **person context rail** on the right shows who you’re talking to — their tags, issues of interest, and a link straight to their record.',
      },
      { kind: 'h2', id: 'workflow', text: 'A healthy inbox rhythm' },
      {
        kind: 'list',
        items: [
          'Answer oldest first — each open conversation shows an **SLA pill** with the time left to reply (it turns amber as the deadline nears, red once it’s overdue), and the [Dashboard](/dashboard) rolls breaches up into a status.',
          'Scan the list by status — each row carries a chip: **Unassigned** (needs an owner), **Assigned**, or **Closed**.',
          '**Sync now** pulls new mail and reports what changed; the line beneath it shows when the inbox last synced.',
          'While replies are sending, the top bar shows a sending indicator with a count; you can navigate away freely.',
          'Notifications alert you to activity that needs you — tune them under **Settings** in the avatar menu.',
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
        text: 'Automations (under [Automations](/automations) in the sidebar) do the repetitive follow-through for you: the welcome sequence for new subscribers, the thank-you after a gift, the reminder before a shift. The list shows each automation as a one-line recipe — the trigger and its steps — with how many times it ran in the last 30 days and how the last run went.',
      },
      { kind: 'h2', id: 'anatomy', text: 'Anatomy of an automation' },
      {
        kind: 'list',
        items: [
          '**Trigger** — the one event that lets someone in: Form submitted, Person created, Tag added, List joined, Donation recorded, a billing event, a volunteer shift status, a task breaching SLA, a new subscriber or unsubscriber, a date arriving, or plain Manual enrollment. Everything after the trigger is the sequence.',
          '**Steps** — what happens, in order. Add a **Wait**, **Send email**, **Add tag**, **Create task**, or **Notify team** at any insertion point; waits and actions can be mixed in any order.',
          '**Only enroll if** — optional conditions on the right rail. With none, everyone who hits the trigger enrolls.',
          '**Active / Paused** — Active runs every time the trigger fires. Pausing stops new runs immediately; nothing queues while paused.',
        ],
      },
      { kind: 'h2', id: 'first', text: 'A good first automation' },
      {
        kind: 'steps',
        items: [
          {
            title: 'Open [Automations](/automations) and click New automation',
            detail: 'Pick a trigger from the twelve cards — that’s the event that enrolls people.',
          },
          {
            title: 'Build the sequence',
            detail: 'Use the + between steps to add a wait, an email, a tag, a task, or a team notification.',
          },
          {
            title: 'Name it and set it Active',
            detail:
              'The name is how the list and the Activity log refer to it. Once it’s active it starts watching for the trigger.',
          },
        ],
      },
      { kind: 'h2', id: 'enrolled', text: 'Who’s enrolled' },
      {
        kind: 'p',
        text: 'The Enrolled contacts tab shows who is moving through the sequence and where they are. Enrollment is per contact — someone already in the sequence isn’t enrolled twice by the same trigger.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Every run is logged',
        text: 'Each step an automation runs is written to the Activity log, and the last run shows on the list — a failure names the step that failed, so you can see exactly where to look.',
      },
    ],
  },
];
