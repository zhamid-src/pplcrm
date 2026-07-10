import type { HelpArticle } from '../help-types';

export const ADMIN_ARTICLES: HelpArticle[] = [
  {
    id: 'profile',
    category: 'admin',
    title: 'Your profile',
    summary:
      'Your photo, your details, and your personal notification preferences — plus a snapshot of your own impact.',
    keywords: ['profile', 'avatar', 'photo', 'account', 'notification preferences', 'personal settings', 'my account'],
    related: ['users-roles', 'settings', 'getting-around'],
    blocks: [
      {
        kind: 'p',
        text: 'Open your [Profile](/profile) from the avatar menu in the top-right corner. This page is about you: how you appear to teammates, which notifications reach you, and what you have contributed.',
      },
      { kind: 'h2', id: 'photo', text: 'Profile photo' },
      {
        kind: 'p',
        text: 'Upload a photo and crop it right in the app — or remove it to fall back to the default. A real photo makes assignment menus and activity feeds much easier to scan for everyone.',
      },
      { kind: 'h2', id: 'notifications', text: 'Notification preferences' },
      {
        kind: 'p',
        text: 'Choose, per event, whether you are alerted — mentions in comments, tasks assigned to you, tasks due, contacts assigned to you, finished exports, and import summaries. The **Email notifications** card on your Profile — grouped into “About your work” and “About your data” — flips each email alert on or off, and every switch applies instantly (there is nothing to save). For the full grid with separate email and in-app switches, open **Settings** from the avatar menu. Administrators set workspace defaults, but your choices there are yours. See [Settings and configuration](/help/settings).',
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Verify your email',
        text: 'If a “verification pending” notice sits at the top of your profile, click the link in the verification email — some features stay limited until your address is confirmed.',
      },
      { kind: 'h2', id: 'impact', text: 'Your activity and impact' },
      {
        kind: 'p',
        text: 'The bottom of the profile tallies your recent contributions in the workspace — a quick answer to “what did I actually get done this month?”',
      },
    ],
  },
  {
    id: 'users-roles',
    category: 'admin',
    title: 'Users and roles',
    summary: 'Invite teammates, understand viewer / editor / admin, and enforce sign-in security like MFA.',
    keywords: ['users', 'roles', 'invite', 'admin', 'editor', 'viewer', 'permissions', 'access', 'mfa', 'security'],
    related: ['settings', 'profile', 'activity-log'],
    blocks: [
      {
        kind: 'p',
        text: 'User management lives under [Users](/users) in the Admin section — visible to administrators only. Every teammate gets their own account; shared logins defeat both security and the activity log.',
      },
      {
        kind: 'p',
        text: 'The page opens with a one-line summary — how many users, how many are active or invited, and how many plan seats are in use. Each row shows a **Status** chip — **Active**, **Invited** (account created, not yet signed in), or **Deactivated** — plus an **MFA** column showing who has multi-factor sign-in turned on and a **Last active** column based on real sign-in sessions. Change someone’s role right in the row with the role dropdown; your own role is locked, which prevents an accidental self-lockout. The **⋯** menu on each row opens the profile or sends a password reset email.',
      },
      { kind: 'h2', id: 'invite', text: 'Inviting someone' },
      {
        kind: 'p',
        text: '**Invite user** opens a dialog asking for the person’s email, first and last name, and role. The invitation arrives by email with an activation link that **expires after 7 days**, and it takes a plan seat right away — the dialog tells you how many seats remain. If an invitation lapses, send the person a password reset from the row’s **⋯** menu to issue a fresh link. When every seat is in use, the button explains that too; free a seat or upgrade under **Settings → Billing**.',
      },
      { kind: 'h2', id: 'roles', text: 'The roles' },
      {
        kind: 'list',
        items: [
          '**Viewer** — read-only: sees the data, changes nothing. Right for stakeholders and observers.',
          '**Editor** — the working role: manages contacts, sends newsletters, runs the daily work.',
          '**Admin** — everything, plus the Admin area: users, workspace configuration, and the workspace-wide activity log.',
          '**Owner** — everything an admin can do, plus billing and workspace lifecycle. Every workspace keeps at least one owner, and only an owner can change another owner’s role.',
        ],
      },
      {
        kind: 'p',
        text: 'New invitations default to the role set under **Workspace → Teams & Access**. Grant the least role that lets someone do their job — you can always raise it later.',
      },
      { kind: 'h2', id: 'mfa', text: 'Multi-factor authentication' },
      {
        kind: 'p',
        text: 'Turn on **Require MFA for all users** (Workspace → Teams & Access) and every sign-in from a new device or location must be confirmed with an email verification code. Strongly recommended once more than a couple of people share the workspace.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Departures checklist',
        text: 'When someone leaves, deactivate their account promptly. Their history stays attributed to them in the activity log; only their access ends.',
      },
    ],
  },
  {
    id: 'settings',
    category: 'admin',
    title: 'Settings and configuration',
    summary:
      'Two front doors: Settings for personal preferences, Workspace for policy that affects everyone (administrators).',
    keywords: [
      'settings',
      'configuration',
      'organization',
      'communications',
      'appearance',
      'billing',
      'integrations',
      'sla settings',
      'workspace',
    ],
    related: ['users-roles', 'newsletters', 'dashboard', 'profile'],
    blocks: [
      {
        kind: 'p',
        text: 'PeopleCRM separates what affects **you** from what affects **everyone**. **Settings** (avatar menu → Settings) opens a compact popup for your personal preferences and applies every change instantly — there is nothing to save. The [Workspace](/workspace) settings — administrators only, under **Admin** in the sidebar — set policy for everyone and use a deliberate **Save** with a leave-guard.',
      },
      { kind: 'h2', id: 'personal', text: 'What lives in your Settings popup' },
      {
        kind: 'list',
        items: [
          '**Notifications** — a per-event matrix of email and in-app switches (mentions, task assigned, tasks due, person assigned, export ready, import summary). Each toggle saves as you flip it.',
          '**Appearance** — Theme: Light, Dark, or System (follows your device’s setting), applied live.',
          '**Passkeys** — the devices that can sign you in; add one with your device prompt, or remove one you no longer trust.',
        ],
      },
      { kind: 'h2', id: 'configuration', text: 'What lives in the Workspace settings' },
      {
        kind: 'list',
        items: [
          '**Organization** — your name, contact details, and mailing address.',
          '**Communications** — default from-name and from-address (verified senders only), reply-to, the newsletter footer disclaimer, and double opt-in for web-form subscribers.',
          '**Notifications** — workspace-wide notification defaults (individuals refine their own on their profile).',
          '**Teams & access** — default role for invitations and the MFA requirement.',
          '**Service levels** — response-time targets for email and tasks, working days and hours, and the warning/critical thresholds behind the dashboard status.',
          '**Appearance** — default theme and date format for the workspace.',
          '**Integrations & API** — webhook keys and connected services.',
          '**Billing** — your plan and payment details.',
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Cannot see the Workspace section?',
        text: 'It is admin-only. If a setting here matters to you, ask a workspace administrator — see [Users and roles](/help/users-roles).',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Unsaved changes stay visible',
        text: 'Editing a Workspace section marks it dirty with an amber dot in the left rail, so you can move between sections without losing track of what still needs a **Save**. Navigating away while dirty asks before discarding.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Three settings to nail on day one',
        text: 'Organization details, the Communications sender identity, and SLA working hours — everything else can wait, but these three shape every email you send and every number on the dashboard.',
      },
    ],
  },
  {
    id: 'activity-log',
    category: 'admin',
    title: 'The activity log',
    summary: 'Who changed what, when — on every record page, and workspace-wide for administrators.',
    keywords: ['activity', 'audit', 'history', 'log', 'changes', 'who changed', 'accountability'],
    related: ['users-roles', 'person-profile'],
    blocks: [
      {
        kind: 'p',
        text: 'Every record that can change keeps a running history — open its **Activity** tab to see edits and touches in order, each attributed to a person and a time. It answers “who changed this phone number?” without a meeting.',
      },
      { kind: 'h2', id: 'log-interaction', text: 'Log an interaction' },
      {
        kind: 'p',
        text: 'The history is not only automatic. On any person, household, or company page, use **Log an interaction** in the header to record a real-world touch — a **call**, **door knock**, **email or note**, or **meeting** — with an optional note. It is attributed to you and joins that record’s Activity immediately, so a phone call or a conversation at the door leaves the same durable trail as an edit.',
      },
      { kind: 'h2', id: 'workspace', text: 'The workspace-wide view' },
      {
        kind: 'p',
        text: 'Administrators also get [Activity](/activity) under Admin: the same trail across the entire workspace, useful for auditing a busy day, tracing an import’s effects, or reviewing what an account did before it was deactivated.',
      },
      {
        kind: 'p',
        text: 'Filter by **Actor**, **Item type**, or **Action** to narrow the trail, and events are grouped by day (Today, Yesterday, then dated) so a busy stretch stays scannable. Actions taken through a public token — like a delivery volunteer following their link — are labelled **via volunteer link** rather than pinned on a signed-in teammate. Use **Export log** to download the filtered trail as `activity-log.csv`. The workspace log keeps the last **90 days**; older events are pruned automatically.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'The log is a teaching tool',
        text: 'When data looks wrong, check the activity first. Most “mystery changes” turn out to be a teammate with good intentions and a different assumption — now you know who to sync with.',
      },
    ],
  },
  {
    id: 'campaigns-contexts',
    category: 'admin',
    title: 'Campaigns and contexts',
    summary:
      'One shared contact list, separate campaign workspaces — how the office and election campaigns coexist without mixing supporter data.',
    keywords: [
      'campaigns',
      'campaign',
      'context',
      'office',
      'election',
      'switcher',
      'archive',
      'workspace',
      'constituency',
    ],
    related: ['users-roles', 'activity-log'],
    blocks: [
      {
        kind: 'p',
        text: 'Your workspace always has one permanent **office** context — the constituency office’s day-to-day home. When an election comes, create an **election campaign** alongside it under [Campaigns](/campaigns) in the Admin section. People, households, and companies are shared across every context: one contact list, no duplicates. What stays separate per campaign is what you learn and are permitted to do in it — supporter data, email consent, and outreach.',
      },
      { kind: 'h2', id: 'switching', text: 'Switching contexts' },
      {
        kind: 'p',
        text: 'The switcher at the top of the sidebar shows which context you are working in — click it to jump between the office and any campaign. The choice is yours alone (teammates can be working in a different context at the same time) and it follows you across devices.',
      },
      { kind: 'h2', id: 'separate', text: 'What is separate per campaign' },
      {
        kind: 'list',
        items: [
          '**Support level** — Strong, Leaning, Neutral, Leaning against, Against, Undecided; “Unknown” simply means never asked. Someone can back your office work and oppose the campaign, or vice versa.',
          '**Voting status** — Will vote, Voted (advance or election day), Not voting, Ineligible. Once someone has voted in advance they drop out of later call and knock lists.',
          '**Email consent** — subscribing to the office newsletter is not consent for campaign email, and unsubscribing from one never touches the other. A hard bounce or spam complaint suppresses the address everywhere, and **do-not-contact** on a person overrides every context.',
          '**Newsletters, donations, forms, lists, events, canvassing turfs, and deliveries** — each belongs to the context it was created in, so campaign funds and office funds never mix.',
          '**The Inbox and its email connection** — each campaign connects its own Office 365 or Gmail account and has its own Inbox. Switching context switches both the connected mailbox and the mail you see; connecting an account under one campaign never affects another. See [The shared inbox](/help/inbox).',
        ],
      },
      { kind: 'h2', id: 'lifecycle', text: 'Campaign lifecycle' },
      {
        kind: 'list',
        items: [
          '**Create** a campaign before the race, with a start date and election day.',
          '**Carry over** support levels from the office or a previous campaign as a starting assumption. Email subscriptions copy only behind an explicit confirmation — consent judgment stays with you. Voting status never carries over.',
          '**Work** in it during the campaign — data recorded there never bleeds into the office.',
          '**Archive** it after the race: everything stays viewable as read-only history, and you can unarchive if late data needs to be entered.',
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'The office cannot be archived or deleted',
        text: 'It is the permanent workspace. Election campaigns cannot be deleted either — archive them instead, so their history and attribution stay intact.',
      },
    ],
  },
];
