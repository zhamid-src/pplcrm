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
        text: 'Choose, per event, whether you are alerted — mentions in comments, tasks assigned to you, tasks due, contacts assigned to you, finished exports, and import summaries, each with separate email and in-app switches. Administrators set workspace defaults, but your choices here are yours.',
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
        text: 'User management lives under [Users](/users) in the System section — visible to administrators only. Every teammate gets their own account; shared logins defeat both security and the activity log.',
      },
      { kind: 'h2', id: 'roles', text: 'The three roles' },
      {
        kind: 'list',
        items: [
          '**Viewer** — read-only: sees the data, changes nothing. Right for stakeholders and observers.',
          '**Editor** — the working role: manages contacts, sends newsletters, runs the daily work.',
          '**Admin** — everything, plus the System area: users, tags, issues, configuration, and the activity log.',
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
        text: 'PeopleCRM separates what affects **you** from what affects **everyone**. [Settings](/settings) (avatar menu → Settings) covers your notifications and appearance. The [Workspace](/configuration) configuration — administrators only, under **System** in the sidebar — sets policy for everyone.',
      },
      { kind: 'h2', id: 'configuration', text: 'What lives in the Workspace configuration' },
      {
        kind: 'list',
        items: [
          '**Organization** — your name, contact details, and mailing address.',
          '**Communications** — default from-name and from-address (verified senders only), reply-to, the newsletter footer disclaimer, and double opt-in for web-form subscribers.',
          '**Notifications** — workspace-wide notification defaults (individuals refine their own on their profile).',
          '**Teams & Access** — default role for invitations and the MFA requirement.',
          '**SLA Configuration** — response-time targets for email and tasks, working days and hours, and the warning/critical thresholds behind the dashboard status.',
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
      { kind: 'h2', id: 'workspace', text: 'The workspace-wide view' },
      {
        kind: 'p',
        text: 'Administrators also get [Activity log](/activities) under System: the same trail across the entire workspace, useful for auditing a busy day, tracing an import’s effects, or reviewing what an account did before it was deactivated.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'The log is a teaching tool',
        text: 'When data looks wrong, check the activity first. Most “mystery changes” turn out to be a teammate with good intentions and a different assumption — now you know who to sync with.',
      },
    ],
  },
];
