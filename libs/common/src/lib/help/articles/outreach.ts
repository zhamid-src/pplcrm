import type { HelpArticle } from '../help-types';

export const OUTREACH_ARTICLES: HelpArticle[] = [
  {
    id: 'newsletters',
    category: 'outreach',
    title: 'Create and send a newsletter',
    summary:
      'Template to audience to send: the full path, plus scheduling, the compliance footer, and how sending progress is shown.',
    keywords: ['newsletter', 'campaign', 'email blast', 'send', 'schedule', 'template', 'audience', 'unsubscribe'],
    related: ['lists', 'tags-issues', 'settings', 'automations', 'sending-protections'],
    blocks: [
      { kind: 'h2', id: 'compose', text: 'From template to draft' },
      {
        kind: 'steps',
        items: [
          {
            title: 'Open [Newsletters](/newsletters) and click New newsletter',
            detail: 'Start from a template or a blank canvas.',
          },
          {
            title: 'Design in the visual editor',
            detail: 'Write and arrange your content visually. What you see is what subscribers get.',
          },
          {
            title: 'Name it clearly',
            detail: 'The name is how you will find it on the Newsletters page and in its performance stats later.',
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Personalize with merge fields',
        text: 'Drop a merge field like `{FirstName}` into your copy and each recipient sees their own value. Supported fields are `{FirstName}`, `{LastName}`, `{Name}`, `{Email}` and `{Phone}`. Add a fallback after a pipe for people missing that detail. `{FirstName|there}` becomes "there" when the first name is blank.',
      },
      { kind: 'h2', id: 'audience', text: 'Choose the audience' },
      {
        kind: 'p',
        text: 'Audiences are built from your [lists](/help/lists) and refined with tags. Include the tags you want, exclude the ones you do not (exclude always wins). The estimated recipient count updates as you adjust, so you know the reach **before** you send, not after.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Dynamic lists shine here',
        text: 'An audience built on a dynamic list is evaluated fresh. Whoever matches on send day gets the email. No stale rosters.',
      },
      { kind: 'h2', id: 'send', text: 'Send or schedule' },
      {
        kind: 'p',
        text: 'Send now, or set a send date to schedule. A finished draft can also go out straight from the [Newsletters](/newsletters) list. Its **Send…** button asks you to confirm before anything leaves, and stays disabled (with the reason shown on hover) until the draft has an audience, a subject and content, and your workspace has a verified sender address. While a send is running, a progress indicator appears in the top bar. You can keep working anywhere in the app; sending happens in the background.',
      },
      {
        kind: 'p',
        text: 'After the send, the [Newsletters](/newsletters) page shows each campaign’s status, audience and open/click rates, with all-time totals (sent campaigns, deliveries, average engagement and bounces) summarized at the top. **View report** opens the full engagement report (it appears once a send is underway, since an unsent campaign has nothing to report), and each recipient’s profile lists the send under their **Newsletters** tab.',
      },
      { kind: 'h2', id: 'report', text: 'Read the engagement report' },
      {
        kind: 'p',
        text: 'The report opens with delivered, open rate, click rate, replies and bounces, then breaks the send down: a delivery funnel (sent → delivered → opened → clicked), every bounced address with the provider’s reason and a hard/soft label plus a CSV export, an hour-by-hour chart of the first 48 hours, the top links clicked, and a comparison of the last five sends in the campaign. Bounced addresses that match a person in the CRM link straight to their profile.',
      },
      {
        kind: 'p',
        text: 'The **What to do next** panel turns the numbers into actions: **Create list of N clickers** snapshots everyone who clicked into a static list for the follow-up send, replies link to the [Inbox](/inbox), and the most engaged readers are listed by name. The side panels show the audience composition at send, unsubscribe and spam-report rates, and the exact content that went out. **Duplicate newsletter** starts the next send from a copy of this one.',
      },
      { kind: 'h2', id: 'compliance', text: 'The footer and opt-in rules' },
      {
        kind: 'list',
        items: [
          'Every newsletter carries your footer disclaimer and an unsubscribe link. Administrators set the disclaimer text under **Workspace → Communications**.',
          'The default from-name and from-address also live there. Only verified sender addresses can be used, which protects your deliverability.',
          'With **double opt-in** enabled, people who subscribe through a web form must confirm by email before they receive newsletters.',
        ],
      },
      {
        kind: 'callout',
        tone: 'warning',
        title: 'Respect unsubscribes',
        text: 'Unsubscribed people are excluded automatically. Do not re-import or re-tag your way around it. It damages trust and your sender reputation.',
      },
      {
        kind: 'p',
        text: 'Before your first send you will also complete a couple of one-time verifications, and new Free workspaces ramp up gradually — see [Sending protections and verification](/help/sending-protections).',
      },
    ],
  },
  {
    id: 'sending-protections',
    category: 'outreach',
    title: 'Sending protections and verification',
    summary:
      'The one-time verifications required before your first newsletter, the Free-plan warm-up limit, and why sending can pause automatically.',
    keywords: [
      'verify domain',
      'verify phone',
      'sms code',
      'sending paused',
      'suspended',
      'bounce rate',
      'spam complaint',
      'warm-up',
      'daily limit',
      'deliverability',
      'anti-spam',
    ],
    related: ['newsletters', 'settings', 'forms'],
    blocks: [
      {
        kind: 'p',
        text: 'Every pplCRM newsletter leaves through a shared sending infrastructure, so one bad sender can hurt everyone’s deliverability. These protections keep spammers out — and for a legitimate organization they cost a few minutes, once.',
      },
      { kind: 'h2', id: 'before-first-send', text: 'Before your first send' },
      {
        kind: 'steps',
        items: [
          {
            title: 'Verify your sending domain',
            detail:
              'Under **Workspace → Domains**, add the domain you send from and create the DNS records it shows you. Then set a **default From address** on that domain under **Workspace → Communications**. Mail authenticated with your own domain lands in inboxes; unauthenticated mail lands in spam.',
          },
          {
            title: 'Verify a mobile number (Free plan)',
            detail:
              'Under **Workspace → Communications → Sending phone verification**, enter a mobile number and confirm the 6-digit SMS code. One number per workspace, one time.',
          },
        ],
      },
      { kind: 'h2', id: 'warmup', text: 'The Free-plan warm-up' },
      {
        kind: 'p',
        text: 'For the first **7 days**, a Free workspace can send up to **100 newsletter emails per day**. If a send is larger than the day’s remaining allowance, you’ll be told before anything goes out — narrow the audience or wait a day. After the first week the normal plan limits apply.',
      },
      { kind: 'h2', id: 'pauses', text: 'Automatic pauses' },
      {
        kind: 'list',
        items: [
          'If a send’s **hard-bounce rate passes 5%**, sending is paused automatically — a bounce rate that high almost always means the list contains addresses that never opted in. Even a send already in progress stops.',
          'If a send’s **spam-complaint rate passes 1%**, the account is suspended pending a human review.',
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'How to never hit these',
        text: 'Only email people who opted in through your [forms](/help/forms), events, or sign-ups. Purchased or scraped lists bounce hard and get reported — the tripwires exist precisely to catch them. If your sending was paused and you believe it’s a mistake, contact support.',
      },
      { kind: 'h2', id: 'plan-features', text: 'Plan-gated features' },
      {
        kind: 'p',
        text: 'Some features are enforced by plan: forms, donations, automations, lists and volunteer management need **Grassroots** or higher; canvassing and deliveries need **Movement**. See your options under [Workspace → Billing](/workspace/billing).',
      },
    ],
  },
  {
    id: 'inbox',
    category: 'outreach',
    title: 'The shared inbox',
    summary:
      'Read and answer your organization’s email inside pplCRM, with every conversation attached to the right person.',
    keywords: ['inbox', 'email', 'reply', 'conversation', 'response time', 'sla email', 'correspondence', 'gmail keys'],
    related: ['dashboard', 'person-profile', 'shortcuts', 'settings'],
    blocks: [
      {
        kind: 'p',
        text: 'The [Inbox](/inbox) is a full email client inside the CRM. The difference from a personal mailbox: conversations connect to contact records, so an exchange with a supporter shows up on their profile’s **Emails** tab, context nobody has to forward around. When you open a conversation, a **person context rail** on the right shows who you’re talking to: their tags, issues of interest, and a link straight to their record.',
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'The Inbox belongs to your active campaign',
        text: 'Each campaign connects its own mailbox and has its own Inbox. Connect an Office 365 or Gmail account while a campaign is active and its mail syncs into that campaign; switch campaigns (from the avatar menu) and both the connected account and the visible mail switch with it. Connect a separate account under each campaign that needs one. Connecting under one campaign never touches another’s.',
      },
      { kind: 'h2', id: 'workflow', text: 'A healthy inbox rhythm' },
      {
        kind: 'list',
        items: [
          'Answer oldest first. Each open conversation shows an **SLA pill** with the time left to reply (it turns amber as the deadline nears, red once it’s overdue), and the [Dashboard](/dashboard) rolls breaches up into a status.',
          'Scan the list by status. Each row carries a chip: **Unassigned** (needs an owner), **Assigned**, or **Closed**.',
          '**Sync now** pulls new mail and reports what changed; the line beneath it shows when the inbox last synced.',
          'While replies are sending, the top bar shows a sending indicator with a count; you can navigate away freely.',
          'Notifications alert you to activity that needs you. Tune them under **Settings** in the avatar menu.',
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Work it like Gmail',
        text: 'The inbox answers to Gmail-style keys: `c` compose, `r` reply, `e` mark done, `s` star, `j`/`k` next and previous, `#` delete, and more. The full table is in [Keyboard shortcuts](/help/shortcuts), or press `?` right in the inbox.',
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Where the response target comes from',
        text: 'Administrators set the email SLA in working hours (plus the working days and business hours that count) under **Workspace → SLA Configuration**. See [The dashboard and SLA health](/help/dashboard).',
      },
    ],
  },
  {
    id: 'automations',
    category: 'outreach',
    title: 'Automations',
    summary:
      'Build multi-step workflows that run on their own, triggered manually or by things that happen, like an event signup.',
    keywords: ['automation', 'workflow', 'trigger', 'steps', 'follow up', 'drip', 'automatic'],
    related: ['newsletters', 'events-shifts', 'tasks'],
    blocks: [
      {
        kind: 'p',
        text: 'Automations (under [Automations](/automations) in the sidebar) do the repetitive follow-through for you: the welcome sequence for new subscribers, the thank-you after a gift, the reminder before a shift. The list shows each automation as a one-line recipe (the trigger and its steps) with how many times it ran in the last 30 days and how the last run went.',
      },
      { kind: 'h2', id: 'anatomy', text: 'Anatomy of an automation' },
      {
        kind: 'list',
        items: [
          '**Trigger** is the one event that lets someone in: Form submitted, Person created, Tag added, List joined, Donation recorded, a billing event, a volunteer shift status, a task breaching SLA, a new subscriber or unsubscriber, a date arriving, or plain Manual enrollment. Everything after the trigger is the sequence.',
          '**Steps**: what happens, in order. Add a **Wait**, **Send email**, **Add tag**, **Create task**, or **Notify team** at any insertion point; waits and actions can be mixed in any order.',
          '**Only enroll if** sets optional conditions on the right rail. With none, everyone who hits the trigger enrolls.',
          '**Active / Paused**: Active runs every time the trigger fires. Pausing stops new runs immediately; nothing queues while paused.',
        ],
      },
      { kind: 'h2', id: 'first', text: 'A good first automation' },
      {
        kind: 'steps',
        items: [
          {
            title: 'Open [Automations](/automations) and click New automation',
            detail: 'Pick a trigger from the twelve cards. That’s the event that enrolls people.',
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
        text: 'The Enrolled contacts tab shows who is moving through the sequence and where they are. Enrollment is per contact. Someone already in the sequence isn’t enrolled twice by the same trigger.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Every run is logged',
        text: 'Each step an automation runs is written to the Activity log, and the last run shows on the list. A failure names the step that failed, so you can see exactly where to look.',
      },
    ],
  },
];
